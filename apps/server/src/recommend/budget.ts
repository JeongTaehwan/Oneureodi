/** 예산은 2인 합산. 가격 힌트는 1인 기준이므로 인원을 곱한다. */
export const PEOPLE = 2;

export interface CourseCost {
  /** 가격이 알려진 장소만 합산한 2인 총액 */
  knownTotalKrw: number;
  /** 가격을 모르는 장소가 하나라도 있으면 true → "+α" */
  hasUnknownPrice: boolean;
}

export function courseCost(stops: readonly { priceHintKrw: number | null }[], people: number = PEOPLE): CourseCost {
  let known = 0;
  let unknown = false;
  for (const s of stops) {
    if (s.priceHintKrw === null) unknown = true;
    else known += s.priceHintKrw * people;
  }
  return { knownTotalKrw: known, hasUnknownPrice: unknown };
}

/** 알려진 금액만으로 판정한다. 모르는 값을 0 으로 치는 것과 결과는 같지만, 그 사실을 hasUnknownPrice 로 드러낸다. */
export function withinBudget(cost: CourseCost, budgetKrw: number): boolean {
  return cost.knownTotalKrw <= budgetKrw;
}
