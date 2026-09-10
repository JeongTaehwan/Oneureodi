import { courseCost, withinBudget } from "./budget";

describe("courseCost", () => {
  it("1인 가격 합에 2를 곱한다", () => {
    expect(courseCost([{ priceHintKrw: 10000 }, { priceHintKrw: 5000 }])).toEqual({
      knownTotalKrw: 30000,
      hasUnknownPrice: false,
    });
  });

  it("가격 모르는 장소는 합에서 빼고 +α 표시를 켠다", () => {
    expect(courseCost([{ priceHintKrw: 10000 }, { priceHintKrw: null }])).toEqual({
      knownTotalKrw: 20000,
      hasUnknownPrice: true,
    });
  });
});

describe("withinBudget", () => {
  it("알려진 총액이 예산과 같으면 통과, 1원이라도 넘으면 탈락", () => {
    expect(withinBudget({ knownTotalKrw: 50000, hasUnknownPrice: false }, 50000)).toBe(true);
    expect(withinBudget({ knownTotalKrw: 50001, hasUnknownPrice: false }, 50000)).toBe(false);
  });

  it("전부 가격 미상이면 0원으로 통과한다 (+α 로 드러난다)", () => {
    expect(withinBudget(courseCost([{ priceHintKrw: null }]), 0)).toBe(true);
  });
});
