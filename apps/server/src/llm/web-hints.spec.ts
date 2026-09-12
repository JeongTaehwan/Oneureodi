import { SOURCE_SPECS, buildResearchText } from "./web-hints";

describe("buildResearchText", () => {
  it("URL 기준으로 중복을 접고 번호와 출처 종류를 붙인다", () => {
    const { text, sources } = buildResearchText([
      { kind: "blog", title: "글A", url: "https://a", content: " 성수 카페 소개 ", publishedAt: null },
      { kind: "instagram", title: "글A 복제", url: "https://a", content: "x", publishedAt: null },
      { kind: "instagram", title: "", url: "https://b", content: "맛집", publishedAt: null },
      { kind: "web", title: "주소 없음", url: "", content: "무시", publishedAt: null },
    ]);
    expect(sources.map((s) => [s.url, s.kind])).toEqual([
      ["https://a", "blog"],
      ["https://b", "instagram"],
    ]);
    expect(text).toBe("[1] (블로그) 글A\n성수 카페 소개\n\n[2] (인스타그램) \n맛집");
  });
});

describe("SOURCE_SPECS", () => {
  it("지역당 검색 5번, 인스타그램은 모음 페이지를 버린다", () => {
    const total = SOURCE_SPECS.reduce((n, s) => n + s.queries("성수동").length, 0);
    expect(total).toBe(5);
    const insta = SOURCE_SPECS.find((s) => s.kind === "instagram");
    expect(insta?.includeDomains).toEqual(["instagram.com"]);
    expect(insta?.dropUrlContaining).toContain("/popular/");
  });
});
