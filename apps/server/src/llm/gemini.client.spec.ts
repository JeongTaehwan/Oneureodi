import { z } from "zod";
import { insertMarkersByByteOffset, toGeminiJsonSchema } from "./gemini.client";
import { insertCitationMarkers } from "./llm-client";

describe("insertMarkersByByteOffset", () => {
  it("한글(3바이트) 뒤에 바이트 오프셋으로 표시를 끼운다", () => {
    // "성수" = 6 bytes, " 카페" = 1 + 6 bytes
    const text = "성수 카페";
    expect(insertMarkersByByteOffset(text, [{ end: 6, sourceIndexes: [1] }])).toBe("성수[1] 카페");
    expect(insertMarkersByByteOffset(text, [{ end: 13, sourceIndexes: [2, 3] }])).toBe("성수 카페[2,3]");
  });

  it("여러 표시는 뒤에서부터 넣어 앞 오프셋이 밀리지 않는다", () => {
    expect(insertMarkersByByteOffset("ab", [{ end: 1, sourceIndexes: [1] }, { end: 2, sourceIndexes: [2] }])).toBe("a[1]b[2]");
  });

  it("범위를 넘는 오프셋은 끝으로 붙인다", () => {
    expect(insertMarkersByByteOffset("ab", [{ end: 99, sourceIndexes: [1] }])).toBe("ab[1]");
  });
});

describe("insertCitationMarkers (문자 오프셋)", () => {
  it("문자 인덱스 기준으로 끼운다", () => {
    expect(insertCitationMarkers("성수 카페", [{ end: 2, sourceIndexes: [1] }])).toBe("성수[1] 카페");
  });
});

describe("toGeminiJsonSchema", () => {
  it("$schema 를 빼고 nullable 은 anyOf 로 낸다", () => {
    const s = toGeminiJsonSchema(z.object({ a: z.string().nullable(), b: z.number().int() }));
    expect(s["$schema"]).toBeUndefined();
    expect(s["type"]).toBe("object");
    const props = s["properties"] as Record<string, unknown>;
    expect(JSON.stringify(props["a"])).toContain("null");
    expect(JSON.stringify(props["b"])).toContain("integer");
  });
});
