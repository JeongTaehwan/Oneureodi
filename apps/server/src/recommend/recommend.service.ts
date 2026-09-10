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
  ) {}

  async recommend(req: RecommendRequest): Promise<RecommendResponse> {
    const started = Date.now();

    const anchor = await this.kakao.geocode(req.location);
    if (!anchor) throw new NotFoundException(`"${req.location}" 위치를 찾을 수 없습니다`);
    const radiusM = req.hasCar ? this.env.CAR_RADIUS_M : this.env.NO_CAR_RADIUS_M;

    const { snapshot, fromCache } = await this.areaCache.getArea(anchor, radiusM, req.location);
    const candidates = filterByParking(buildCandidates(snapshot), req.hasCar);
    const meta = { anchor, radiusM, candidateCount: candidates.length, fromCache };

    if (candidates.length === 0) {
      return { courses: [], meta: { ...meta, elapsedMs: Date.now() - started } };
    }

    const selected = selectCandidates(candidates, this.env.MAX_LLM_CANDIDATES);
    const composed = await this.composer.compose(req, selected);
    const courses = materialize(composed, selected, req).slice(0, MAX_COURSES);

    this.log.log(
      `${req.location} cache=${fromCache} candidates=${candidates.length} composed=${composed.length} → courses=${courses.length} ${Date.now() - started}ms`,
    );
    return { courses, meta: { ...meta, elapsedMs: Date.now() - started } };
  }
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
  };
}
