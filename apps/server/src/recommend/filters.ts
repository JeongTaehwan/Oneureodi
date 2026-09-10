import type { Parking } from "@oneureodi/shared";

/**
 * 차가 있으면 "주차되는 데만". 정보 없음(unknown)은 빠지지 않고 통과한다 — 결과에 "정보 없음"으로 표시된다.
 * 차가 없으면 주차는 조건이 아니다.
 */
export function filterByParking<T extends { parking: Parking }>(items: readonly T[], hasCar: boolean): T[] {
  if (!hasCar) return [...items];
  return items.filter((i) => i.parking !== "no");
}
