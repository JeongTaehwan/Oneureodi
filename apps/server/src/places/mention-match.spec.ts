import { deriveParking, derivePrice, matchMentions, type ExtractedMention } from "./mention-match";

const m = (placeName: string): ExtractedMention => ({
  placeName,
  hint: null,
  priceHintKrw: null,
  parking: "unknown",
  sourceUrl: "https://example.com/post",
  sourceTitle: "글",
  publishedAt: null,
});

describe("matchMentions", () => {
  const places = [
    { id: "1", name: "블루보틀 성수점" },
    { id: "2", name: "어니언 성수" },
    { id: "3", name: "어니언" },
  ];

  it("지점명을 떼고 맞춘다", () => {
    expect(matchMentions([m("블루보틀")], places).matched[0]?.placeId).toBe("1");
  });

  it("여러 후보면 더 구체적인 이름을 고른다", () => {
    expect(matchMentions([m("어니언 성수")], places).matched[0]?.placeId).toBe("2");
  });

  it("못 맞춘 상호는 중복 없이 모은다", () => {
    const r = matchMentions([m("없는곳"), m("없는곳"), m("다른곳")], places);
    expect(r.matched).toHaveLength(0);
    expect(r.unmatchedNames).toEqual(["없는곳", "다른곳"]);
  });

  it("두 글자 이름은 접두어로 맞추지 않는다", () => {
    expect(matchMentions([m("성수")], places).matched).toHaveLength(0);
  });
});

describe("deriveParking", () => {
  it("yes 가 하나라도 있으면 yes, 없으면 no, 둘 다 없으면 unknown", () => {
    expect(deriveParking(["no", "yes", "unknown"])).toBe("yes");
    expect(deriveParking(["no", "unknown"])).toBe("no");
    expect(deriveParking(["unknown"])).toBe("unknown");
    expect(deriveParking([])).toBe("unknown");
  });
});

describe("derivePrice", () => {
  it("중앙값. null 은 무시", () => {
    expect(derivePrice([null, 10000, 30000, 20000])).toBe(20000);
    expect(derivePrice([10000, 20000])).toBe(15000);
    expect(derivePrice([null])).toBeNull();
  });
});
