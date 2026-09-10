import { buildResearchText, searchQueries } from "./web-hints";

describe("buildResearchText", () => {
  it("URL 기준으로 중복을 접고 번호를 붙인다", () => {
    const { text, sources } = buildResearchText([
      { title: "글A", url: "https://a", content: " 성수 카페 소개 ", publishedAt: null },
      { title: "글A 복제", url: "https://a", content: "x", publishedAt: null },
      { title: "", url: "https://b", content: "맛집", publishedAt: null },
      { title: "주소 없음", url: "", content: "무시", publishedAt: null },
    ]);
    expect(sources).toEqual([
      { url: "https://a", title: "글A", publishedAt: null },
      { url: "https://b", title: "https://b", publishedAt: null },
    ]);
    expect(text).toBe("[1] 글A\n성수 카페 소개\n\n[2] \n맛집");
  });
});

describe("searchQueries", () => {
  it("지역당 질의 3개", () => {
    expect(searchQueries("성수동")).toHaveLength(3);
    expect(searchQueries("성수동")[0]).toContain("성수동");
  });
});
