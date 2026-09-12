import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Course, CourseStop, Leg } from "@oneureodi/shared";
import { mapWithConcurrency } from "../common/http";
import { ENV, Env } from "../config/env";
import { KakaoLocalClient } from "../collectors/kakao-local.client";
import { KakaoRoutingClient, estimateLeg, type RoutedLeg } from "../collectors/kakao-routing.client";
import { haversineM } from "../places/geo";
import { WALK_MAX_M } from "./transport";

/** 같은 프로세스 안에서 같은 구간을 두 번 묻지 않는다. 좌표는 캐시된 장소라 일주일은 안 변한다. */
const MAX_CACHE = 500;

@Injectable()
export class RoutesService {
  private readonly log = new Logger(RoutesService.name);
  /** 값이 아니라 Promise 를 넣는다. 같은 구간을 동시에 물어도 한 번만 나간다. */
  private readonly legCache = new Map<string, Promise<RoutedLeg>>();
  private readonly parkingCache = new Map<string, Promise<CourseStop["parkingLot"]>>();

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly routing: KakaoRoutingClient,
    private readonly local: KakaoLocalClient,
  ) {}

  /** 코스마다 장소 사이 구간을 채우고, 차 있으면 장소별 가장 가까운 주차장을 붙인다. */
  async enrich(courses: readonly Course[], hasCar: boolean): Promise<Course[]> {
    const pairs = courses.flatMap((c) => c.stops.slice(1).map((to, i) => ({ from: c.stops[i] as CourseStop, to })));
    const legs = await mapWithConcurrency(pairs, 4, ({ from, to }) => this.leg(from, to, hasCar));
    const legByKey = new Map(pairs.map((p, i) => [`${p.from.placeId}>${p.to.placeId}`, legs[i] as Leg]));

    let parkingByPlace = new Map<string, CourseStop["parkingLot"]>();
    if (hasCar) {
      const stops = uniqueBy(courses.flatMap((c) => c.stops), (s) => s.placeId);
      const lots = await mapWithConcurrency(stops, 4, (s) => this.parking(s));
      parkingByPlace = new Map(stops.map((s, i) => [s.placeId, lots[i] ?? null]));
    }

    return courses.map((c) => {
      const courseLegs = c.stops.slice(1).map((to, i) => legByKey.get(`${(c.stops[i] as CourseStop).placeId}>${to.placeId}`) as Leg);
      const stops = hasCar ? c.stops.map((s) => ({ ...s, parkingLot: parkingByPlace.get(s.placeId) ?? null })) : c.stops;
      return {
        ...c,
        stops,
        legs: courseLegs,
        totalTravelMin: courseLegs.reduce((sum, l) => sum + l.durationMin, 0),
        transport: hasCar ? "car" : courseLegs.every((l) => l.mode === "walk") ? "walk" : "transit",
      };
    });
  }

  private async leg(from: CourseStop, to: CourseStop, hasCar: boolean): Promise<Leg> {
    const mode: Leg["mode"] = hasCar ? "car" : haversineM(from, to) <= WALK_MAX_M ? "walk" : "transit";
    const key = `${mode}:${from.placeId}>${to.placeId}`;
    let pending = this.legCache.get(key);
    if (!pending) {
      pending = this.route(mode, from, to);
      if (this.legCache.size >= MAX_CACHE) this.legCache.delete(this.legCache.keys().next().value as string);
      this.legCache.set(key, pending);
    }
    const routed = await pending;
    // 캐시된 steps 배열을 여러 코스가 공유하지 않게 복사한다.
    return { ...routed, steps: routed.steps.map((s) => ({ ...s })), fromPlaceId: from.placeId, toPlaceId: to.placeId };
  }

  private async route(mode: Leg["mode"], from: CourseStop, to: CourseStop): Promise<RoutedLeg> {
    try {
      if (mode === "car") return (await this.routing.car(from, to)) ?? estimateLeg("car", from, to);
      if (mode === "walk") return (await this.routing.walk(from, to)) ?? estimateLeg("walk", from, to);
      // 대중교통 경로가 없으면 대중교통 어림값. 도보로 바꾸면 3km 를 "도보 45분"으로 내놓게 된다.
      return (await this.routing.transit(from, to)) ?? estimateLeg("transit", from, to);
    } catch (err) {
      this.log.warn(`경로 조회 실패(${mode} ${from.name} → ${to.name}), 어림값 사용: ${err instanceof Error ? err.message : String(err)}`);
      return estimateLeg(mode, from, to);
    }
  }

  private parking(stop: CourseStop): Promise<CourseStop["parkingLot"]> {
    let pending = this.parkingCache.get(stop.placeId);
    if (!pending) {
      pending = this.local.nearestParking(stop, this.env.PARKING_RADIUS_M);
      if (this.parkingCache.size >= MAX_CACHE) this.parkingCache.delete(this.parkingCache.keys().next().value as string);
      this.parkingCache.set(stop.placeId, pending);
    }
    return pending;
  }
}

function uniqueBy<T>(items: readonly T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(key(i)) ? false : (seen.add(key(i)), true)));
}
