import type { RecommendRequest } from "@oneureodi/shared";
import type { Candidate } from "./candidate";
import { materialize } from "./recommend.service";

const req: RecommendRequest = {
  location: "성수",
  traits: { social: "introvert", activity: "dislike" },
  budgetKrw: 60000,
  hasCar: false,
  meetAt: { weekday: 6, time: "14:00" },
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
