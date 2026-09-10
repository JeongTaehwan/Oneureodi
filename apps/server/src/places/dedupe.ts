import type { RawPlace } from "../collectors/types";
import { namesMatch } from "../common/text";
import { haversineM } from "./geo";

/** 같은 곳으로 보는 거리 상한. 지도 공급자마다 좌표가 수십 m 어긋난다. */
const SAME_PLACE_M = 200;

/**
 * 카테고리 검색과 이름 조회에서 같은 가게가 두 번 나오면 먼저 온 것을 남긴다.
 * 판정: 이름이 맞고 200m 안.
 */
export function dedupePlaces(places: readonly RawPlace[]): RawPlace[] {
  const kept: RawPlace[] = [];
  for (const p of places) {
    const dup = kept.some((k) => namesMatch(k.name, p.name) && haversineM(k, p) <= SAME_PLACE_M);
    if (!dup) kept.push(p);
  }
  return kept;
}
