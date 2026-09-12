import type { RecommendRequest } from "@oneureodi/shared";
import type { Candidate } from "./candidate";
import { MIN_CANDIDATES_AFTER_EXCLUDE, applySchedule, excludeSeen, materialize } from "./recommend.service";

const req: RecommendRequest = {
  location: "성수",
  traits: { social: "introvert", activity: "dislike" },
  budgetKrw: 60000,
  hasCar: false,
  meetAt: { weekday: 6, time: "14:00" },
  excludePlaceIds: [],
};

const cand = (id: string, price: number | null, lat = 37.54, lng = 127.05): Candidate => ({
  id,
  name: id,
  category: null,
  address: null,
  lat,
  lng,
  url: null,
  parking: "unknown",
  priceHintKrw: price,
  hints: [],
  mentionCount: 0,
  mentionCounts: { blog: 0, instagram: 0, web: 0 },
});

describe("materialize", () => {
  it("후보에 없는 id 와 중복 id 를 버리고, 예산 넘는 코스를 탈락시킨다", () => {
    const candidates = [cand("a", 10000), cand("b", 25000), cand("c", null)];
    const out = materialize(
      [
        { title: "싼 코스", reason: "r", stopPlaceIds: ["a", "a", "ghost", "c"] },
        { title: "비싼 코스", reason: "r", stopPlaceIds: ["a", "b"] },
      ],
      candidates,
      req,
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.title).toBe("싼 코스");
    expect(out[0]?.stops.map((s) => s.placeId)).toEqual(["a", "c"]);
    expect(out[0]?.knownTotalKrw).toBe(20000);
    expect(out[0]?.hasUnknownPrice).toBe(true);
  });

  it("차 없고 정류장이 1km 안이면 도보, 넘으면 대중교통", () => {
    const near = [cand("a", 0, 37.54, 127.05), cand("b", 0, 37.545, 127.05)]; // 약 550m
    const far = [cand("a", 0, 37.54, 127.05), cand("b", 0, 37.56, 127.05)]; // 약 2.2km
    expect(materialize([{ title: "t", reason: "r", stopPlaceIds: ["a", "b"] }], near, req)[0]?.transport).toBe("walk");
    expect(materialize([{ title: "t", reason: "r", stopPlaceIds: ["a", "b"] }], far, req)[0]?.transport).toBe("transit");
    expect(
      materialize([{ title: "t", reason: "r", stopPlaceIds: ["a", "b"] }], far, { ...req, hasCar: true })[0]?.transport,
    ).toBe("car");
  });
});

describe("excludeSeen", () => {
  const many = Array.from({ length: MIN_CANDIDATES_AFTER_EXCLUDE + 5 }, (_, i) => ({ id: `p${i}` }));

  it("이미 본 장소를 빼고도 후보가 충분하면 뺀다", () => {
    const out = excludeSeen(many, ["p0", "p1"]);
    expect(out).toHaveLength(many.length - 2);
    expect(out.some((c) => c.id === "p0")).toBe(false);
  });

  it("빼면 너무 적어지면 빼지 않는다", () => {
    const few = many.slice(0, MIN_CANDIDATES_AFTER_EXCLUDE + 1);
    expect(excludeSeen(few, ["p0", "p1"])).toHaveLength(few.length);
  });

  it("제외 목록이 비면 그대로", () => {
    expect(excludeSeen(many, [])).toHaveLength(many.length);
  });
});

describe("applySchedule", () => {
  const at13 = { ...req, meetAt: { weekday: 6, time: "13:00" } };
  const bar = { ...cand("bar", 20000), category: "음식점 > 술집 > 와인바" };
  const cafe = { ...cand("cafe", 6000), category: "음식점 > 카페" };
  const gallery = { ...cand("gal", null), category: "문화,예술 > 문화시설 > 미술관" };

  it("13시 약속에 와인바가 첫 장소면 떨어진다", () => {
    const [c] = applySchedule(materialize([{ title: "t", reason: "r", stopPlaceIds: ["bar", "cafe"] }], [bar, cafe], at13), at13, () => 15);
    expect(c?.scheduleOk).toBe(false);
    expect(c?.stops[0]?.arrivalTime).toBe("13:00");
  });

  it("카페 → 전시 → 와인바 순서에 이동 60분씩이면 와인바 17:00 이후 도착으로 통과", () => {
    const [c] = applySchedule(materialize([{ title: "t", reason: "r", stopPlaceIds: ["cafe", "gal", "bar"] }], [bar, cafe, gallery], at13), at13, () => 60);
    expect(c?.stops.map((s) => s.arrivalTime)).toEqual(["13:00", "15:00", "17:20"]);
    expect(c?.scheduleOk).toBe(true);
    expect(c?.endTime).toBe("18:50");
    expect(c?.stops[2]?.openLabel).toBe("17:00~02:00");
  });
});
