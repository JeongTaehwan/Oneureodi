import { filterByParking } from "./filters";

const places = [
  { name: "주차됨", parking: "yes" as const },
  { name: "주차안됨", parking: "no" as const },
  { name: "모름", parking: "unknown" as const },
];

describe("filterByParking", () => {
  it("차가 있으면 주차 불가만 빼고, 정보 없음은 남긴다", () => {
    expect(filterByParking(places, true).map((p) => p.name)).toEqual(["주차됨", "모름"]);
  });

  it("차가 없으면 아무것도 빼지 않는다", () => {
    expect(filterByParking(places, false)).toHaveLength(3);
  });
});
