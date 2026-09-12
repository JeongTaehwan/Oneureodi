import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { Course, CourseStop, RecommendRequest, RecommendResponse } from "@oneureodi/shared";
import { MAX_COURSES } from "@oneureodi/shared";
import { ENV, Env } from "../config/env";
import { KakaoLocalClient } from "../collectors/kakao-local.client";
import { CourseComposer, type ComposedCourse } from "../llm/compose-courses";
import { AreaCacheService } from "../places/area-cache.service";
import { courseCost, withinBudget } from "./budget";
import { buildCandidates, type Candidate } from "./candidate";
import { filterByParking } from "./filters";
import { RoutesService } from "./routes.service";
import { describeWindow, fitsDate, scheduleStops, windowFor } from "./schedule";
import { selectCandidates } from "./select-candidates";
import { deriveTransport } from "./transport";

@Injectable()
export class RecommendService {
  private readonly log = new Logger(RecommendService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly kakao: KakaoLocalClient,
    private readonly areaCache: AreaCacheService,
    private readonly composer: CourseComposer,
    private readonly routes: RoutesService,
  ) {}

  async recommend(req: RecommendRequest): Promise<RecommendResponse> {
    const started = Date.now();

    const anchor = await this.kakao.geocode(req.location);
    if (!anchor) throw new NotFoundException(`"${req.location}" 위치를 찾을 수 없습니다`);
    const radiusM = req.hasCar ? this.env.CAR_RADIUS_M : this.env.NO_CAR_RADIUS_M;

    const { snapshot, fromCache } = await this.areaCache.getArea(anchor, radiusM, req.location);
    const all = filterByParking(buildCandidates(snapshot), req.hasCar).filter((c) => fitsDate(windowFor(c.category, c.name), req.meetAt));
    const candidates = excludeSeen(all, req.excludePlaceIds);
    const meta = { anchor, radiusM, candidateCount: candidates.length, fromCache };

    if (candidates.length === 0) {
      return { courses: [], meta: { ...meta, elapsedMs: Date.now() - started } };
    }

    const selected = selectCandidates(candidates, this.env.MAX_LLM_CANDIDATES);
    const composed = await this.composer.compose(req, selected);
    // 시간표 검사 두 번: 경로를 묻기 전에 어림 이동시간으로 한 번(쿼터 절약), 실제 이동시간으로 한 번 더.
    const drafted = applySchedule(materialize(composed, selected, req), req, () => 15).filter((c) => c.scheduleOk);
    const routed = await this.routes.enrich(drafted.slice(0, MAX_COURSES), req.hasCar);
    const courses = applySchedule(routed, req, (c, i) => c.legs[i]?.durationMin ?? 15).filter((c) => c.scheduleOk);

    this.log.log(
      `${req.location} ${req.meetAt.time} cache=${fromCache} candidates=${candidates.length} composed=${composed.length} timeOk=${drafted.length} → courses=${courses.length} ${Date.now() - started}ms`,
    );
    return { courses, meta: { ...meta, elapsedMs: Date.now() - started } };
  }
}

/** "다른 코스 더 보기"에서 이미 보여준 장소를 뺀다. 남는 후보가 너무 적으면 빼지 않는다 (0개보다 겹치는 게 낫다). */
export const MIN_CANDIDATES_AFTER_EXCLUDE = 15;
export function excludeSeen<T extends { id: string }>(candidates: readonly T[], excludeIds: readonly string[]): T[] {
  if (excludeIds.length === 0) return [...candidates];
  const seen = new Set(excludeIds);
  const rest = candidates.filter((c) => !seen.has(c.id));
  return rest.length >= MIN_CANDIDATES_AFTER_EXCLUDE ? rest : [...candidates];
}

/** 도착 시각을 계산해 장소마다 붙이고, 열려 있을 수 없는 시각에 가는 코스는 scheduleOk=false 로 표시한다. */
export function applySchedule(
  courses: readonly Course[],
  req: RecommendRequest,
  legMinutes: (course: Course, legIndex: number) => number,
): (Course & { scheduleOk: boolean })[] {
  return courses.map((c) => {
    const mins = c.stops.slice(1).map((_, i) => legMinutes(c, i));
    const sched = scheduleStops(c.stops, mins, req.meetAt);
    return {
      ...c,
      stops: c.stops.map((s, i) => {
        const st = sched.stops[i];
        return { ...s, arrivalTime: st?.arrivalTime ?? req.meetAt.time, stayMin: st?.stayMin ?? 60, openLabel: st ? describeWindow(st.window) : "" };
      }),
      startTime: req.meetAt.time,
      endTime: sched.endTime,
      scheduleOk: sched.allOpen,
    };
  });
}

/** LLM 출력을 검증한다: 모르는 id 제거, 코스 안 중복 제거, 예산 초과 코스 탈락, 이동 방법 산출. */
export function materialize(composed: readonly ComposedCourse[], candidates: readonly Candidate[], req: RecommendRequest): Course[] {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const courses: Course[] = [];
  for (const c of composed) {
    const seen = new Set<string>();
    const stops: CourseStop[] = [];
    for (const id of c.stopPlaceIds) {
      const cand = byId.get(id);
      if (!cand || seen.has(id)) continue;
      seen.add(id);
      stops.push(toStop(cand));
    }
    if (stops.length === 0) continue;
    const cost = courseCost(stops);
    if (!withinBudget(cost, req.budgetKrw)) continue;
    courses.push({
      title: c.title.trim() || `${req.location} 코스`,
      reason: c.reason.trim(),
      transport: deriveTransport(stops, req.hasCar),
      stops,
      legs: [],
      totalTravelMin: 0,
      startTime: req.meetAt.time,
      endTime: req.meetAt.time,
      knownTotalKrw: cost.knownTotalKrw,
      hasUnknownPrice: cost.hasUnknownPrice,
    });
  }
  return courses;
}

function toStop(c: Candidate): CourseStop {
  return {
    placeId: c.id,
    name: c.name,
    category: c.category,
    address: c.address,
    lat: c.lat,
    lng: c.lng,
    url: c.url,
    parking: c.parking,
    priceHintKrw: c.priceHintKrw,
    hint: c.hints[0] ?? null,
    mentionCount: c.mentionCount,
    mentionCounts: c.mentionCounts,
    parkingLot: null,
    arrivalTime: "",
    stayMin: 0,
    openLabel: "",
  };
}
