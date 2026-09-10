import type { Transport } from "@oneureodi/shared";
import type { GeoPoint } from "../collectors/types";
import { haversineM } from "../places/geo";

/** 이 거리 안이면 걸어서 이동한다고 본다. */
export const WALK_MAX_M = 1000;

/** 이동 방법은 AI 가 아니라 코드가 정한다. 차 있으면 차, 없으면 정류장 간 최장 거리로 도보/대중교통. */
export function deriveTransport(stops: readonly GeoPoint[], hasCar: boolean): Transport {
  if (hasCar) return "car";
  let longest = 0;
  for (let i = 1; i < stops.length; i++) {
    longest = Math.max(longest, haversineM(stops[i - 1] as GeoPoint, stops[i] as GeoPoint));
  }
  return longest <= WALK_MAX_M ? "walk" : "transit";
}
