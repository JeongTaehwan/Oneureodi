import { namesMatch, normalizeName, stripBranch, stripHtml } from "./text";

describe("stripHtml", () => {
  it("태그와 엔티티를 지운다", () => {
    expect(stripHtml("<b>성수</b> 데이트 &amp; 카페 &quot;추천&quot;")).toBe('성수 데이트 & 카페 "추천"');
  });
});

describe("stripBranch", () => {
  it("끝의 짧은 지점명만 뗀다", () => {
    expect(stripBranch("블루보틀 성수점")).toBe("블루보틀");
    expect(stripBranch("강남역점")).toBe("강남역점");
    expect(stripBranch("성수 수제버거전문점")).toBe("성수 수제버거전문점");
  });
});

describe("normalizeName / namesMatch", () => {
  it("공백·구두점·대소문자를 무시한다", () => {
    expect(normalizeName("Blue Bottle 성수점")).toBe("bluebottle");
    expect(namesMatch("어니언 성수", "어니언성수")).toBe(true);
  });

  it("3자 이상 접두어면 같은 곳으로 본다", () => {
    expect(namesMatch("어니언", "어니언 성수")).toBe(true);
    expect(namesMatch("카페", "카페 어니언")).toBe(false);
  });
});
