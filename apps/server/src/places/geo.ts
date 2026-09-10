import type { GeoPoint } from "../collectors/types";

const EARTH_RADIUS_M = 6_371_000;

export function haversineM(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** 좌표를 소수 3자리(약 110m)로 묶고 반경을 붙인다. 같은 역을 다른 표기로 넣어도 같은 캐시를 탄다. */
export function anchorKey(center: GeoPoint, radiusM: number): string {
  return `${center.lat.toFixed(3)}:${center.lng.toFixed(3)}:${radiusM}`;
}

/** fetchedAt 이 now 기준 ttl 안이면 신선. 정확히 ttl 만큼 지난 시각은 만료로 본다. */
export function isFresh(fetchedAt: Date, now: Date, ttlMs: number): boolean {
  return now.getTime() - fetchedAt.getTime() < ttlMs;
}
