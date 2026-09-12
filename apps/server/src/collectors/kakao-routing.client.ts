import { Inject, Injectable } from "@nestjs/common";
import type { Leg, RouteStep } from "@oneureodi/shared";
import { ENV, Env } from "../config/env";
import { fetchJson } from "../common/http";
import { haversineM } from "../places/geo";
import type { GeoPoint } from "./types";

/** placeId 를 뺀 경로 결과. 붙이는 건 호출부. */
export type RoutedLeg = Omit<Leg, "fromPlaceId" | "toPlaceId">;

interface TransitStepProps {
  type: string;
  guidance?: string;
  distance?: number;
  time?: number;
  stops?: { name: string }[];
  vehicles?: { name: string; type: string }[];
}

interface TransitResponse {
  status: string;
  routes?: {
    properties: { type: string; totalDistance: number; totalTime: number; transfers: number; fare?: { min: number; max: number } };
    steps: { properties: TransitStepProps }[];
  }[];
  properties?: { landingURL?: string };
}

interface WalkResponse {
  status: string;
  route?: { properties: { totalDistance: number; totalTime: number; landingUrl?: string } };
}

interface CarSection {
  roads?: { name: string; distance: number }[];
}

interface CarResponse {
  routes?: {
    result_code: number;
    summary: { distance: number; duration: number; fare?: { taxi: number; toll: number } };
    sections?: CarSection[];
  }[];
}

const LOCAL = "https://dapi.kakao.com/v2/routing";
const NAVI = "https://apis-navi.kakaomobility.com/v1/directions";

/** 카카오맵 대중교통·도보 경로(각 하루 1,000건)와 카카오모빌리티 자동차 길찾기(하루 10,000건). 키는 로컬 API 와 같다. */
@Injectable()
export class KakaoRoutingClient {
  constructor(@Inject(ENV) private readonly env: Env) {}

  private get headers() {
    return { Authorization: `KakaoAK ${this.env.KAKAO_REST_API_KEY}` };
  }

  private get<T>(url: string, service: string): Promise<T> {
    return fetchJson<T>(url, { service, timeoutMs: this.env.EXTERNAL_TIMEOUT_MS, headers: this.headers });
  }

  async transit(from: GeoPoint, to: GeoPoint): Promise<RoutedLeg | null> {
    const qs = `start_x=${from.lng}&start_y=${from.lat}&end_x=${to.lng}&end_y=${to.lat}`;
    const res = await this.get<TransitResponse>(`${LOCAL}/publictraffic?${qs}`, "kakao-transit");
    const routes = (res.routes ?? []).filter((r) => r.properties.totalTime > 0);
    if (routes.length === 0) return null;
    const best = routes.reduce((a, b) => (b.properties.totalTime < a.properties.totalTime ? b : a));
    const durationMin = minutes(best.properties.totalTime);
    const distanceM = Math.round(best.properties.totalDistance);
    let steps: RouteStep[] = best.steps.map((s) => transitStep(s.properties));
    if (steps.length === 0) steps = [{ kind: "bus", text: `대중교통 ${durationMin}분`, durationMin, distanceM }];
    return {
      mode: "transit",
      distanceM,
      durationMin,
      steps,
      fareKrw: best.properties.fare?.min ?? null,
      // landingURL 은 검색 전체 링크라 우리가 고른(가장 빠른) 경로와 다를 수 있다. 경로가 하나일 때만 믿는다.
      mapUrl: routes.length === 1 ? (res.properties?.landingURL ?? null) : null,
      estimated: false,
    };
  }

  async walk(from: GeoPoint, to: GeoPoint): Promise<RoutedLeg | null> {
    const qs = `start_x=${from.lng}&start_y=${from.lat}&end_x=${to.lng}&end_y=${to.lat}`;
    const res = await this.get<WalkResponse>(`${LOCAL}/walk?${qs}`, "kakao-walk");
    const p = res.route?.properties;
    if (!p) return null;
    const durationMin = minutes(p.totalTime);
    return {
      mode: "walk",
      distanceM: Math.round(p.totalDistance),
      durationMin,
      steps: [{ kind: "walk", text: `도보 ${durationMin}분 (${fmtDistance(p.totalDistance)})`, durationMin, distanceM: Math.round(p.totalDistance) }],
      fareKrw: null,
      mapUrl: p.landingUrl ?? null,
      estimated: false,
    };
  }

  async car(from: GeoPoint, to: GeoPoint): Promise<RoutedLeg | null> {
    const res = await this.get<CarResponse>(`${NAVI}?origin=${from.lng},${from.lat}&destination=${to.lng},${to.lat}`, "kakao-navi");
    const route = res.routes?.[0];
    if (!route || route.result_code !== 0) return null;
    const durationMin = minutes(route.summary.duration);
    const roads = topRoads(route.sections ?? []);
    const via = roads.length > 0 ? ` (${roads.join(" → ")})` : "";
    const toll = route.summary.fare?.toll ?? 0;
    return {
      mode: "car",
      distanceM: Math.round(route.summary.distance),
      durationMin,
      steps: [{ kind: "car", text: `차로 ${durationMin}분${via}${toll > 0 ? `, 통행료 ${toll.toLocaleString("ko-KR")}원` : ""}`, durationMin, distanceM: Math.round(route.summary.distance) }],
      fareKrw: null,
      mapUrl: null,
      estimated: false,
    };
  }
}

/** API 가 실패했을 때 직선거리로 어림한 구간. 화면에 "어림"으로 표시된다. */
export function estimateLeg(mode: Leg["mode"], from: GeoPoint, to: GeoPoint): RoutedLeg {
  const distanceM = Math.round(haversineM(from, to) * 1.3);
  const speedKmh = mode === "car" ? 25 : mode === "walk" ? 4 : 15;
  const base = mode === "transit" ? 5 : 0;
  const durationMin = Math.max(1, Math.round((distanceM / 1000 / speedKmh) * 60 + base));
  const label = mode === "car" ? "차로" : mode === "walk" ? "도보" : "대중교통";
  return {
    mode,
    distanceM,
    durationMin,
    steps: [{ kind: mode === "transit" ? "bus" : mode, text: `${label} 약 ${durationMin}분 (${fmtDistance(distanceM)}, 어림)`, durationMin, distanceM }],
    fareKrw: null,
    mapUrl: null,
    estimated: true,
  };
}

function transitStep(p: TransitStepProps): RouteStep {
  // 단계는 1분 미만일 수 있으니 올림하지 않는다. 합이 구간 총계를 넘지 않게.
  const durationMin = Math.round((p.time ?? 0) / 60);
  const distanceM = Math.round(p.distance ?? 0);
  const type = (p.type ?? "").toUpperCase();
  const stops = p.stops ?? [];
  const first = stops[0]?.name;
  const last = stops[stops.length - 1]?.name;
  const hops = Math.max(stops.length - 1, 0);
  const where = first && last ? ` (${first} → ${last})` : "";
  const vehicle = p.vehicles?.[0];
  if (type.includes("BUS")) {
    const extra = (p.vehicles?.length ?? 0) > 1 ? ` 외 ${(p.vehicles?.length ?? 0) - 1}대` : "";
    const name = vehicle ? `${vehicle.name}번 버스${extra}` : "버스";
    return { kind: "bus", text: `${name} ${hops}정거장${where}`, durationMin, distanceM };
  }
  if (type.includes("SUBWAY")) {
    return { kind: "subway", text: `${vehicle?.name ?? "지하철"} ${hops}정거장${where}`, durationMin, distanceM };
  }
  return { kind: "walk", text: p.guidance?.trim() || `도보 ${Math.max(1, durationMin)}분`, durationMin, distanceM };
}

function topRoads(sections: readonly CarSection[]): string[] {
  const byName = new Map<string, number>();
  for (const s of sections) for (const r of s.roads ?? []) if (r.name) byName.set(r.name, (byName.get(r.name) ?? 0) + r.distance);
  return [...byName.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([name]) => name);
}

function minutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

export function fmtDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}
