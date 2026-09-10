import { selectCandidates } from "./select-candidates";

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const items = Array.from({ length: 20 }, (_, i) => ({ id: i, mentionCount: i }));

describe("selectCandidates", () => {
  it("상한 이하면 전부 돌려준다 (순서만 섞임)", () => {
    const out = selectCandidates(items, 50, seeded(1));
    expect(out).toHaveLength(20);
    expect(new Set(out.map((i) => i.id)).size).toBe(20);
  });

  it("상한을 넘으면 언급 많은 70% 는 반드시 들어가고 나머지는 무작위", () => {
    const out = selectCandidates(items, 10, seeded(7));
    expect(out).toHaveLength(10);
    const ids = new Set(out.map((i) => i.id));
    for (const mustHave of [19, 18, 17, 16, 15, 14, 13]) expect(ids.has(mustHave)).toBe(true);
  });

  it("같은 시드면 같은 결과, 다른 시드면 다른 결과", () => {
    const a = selectCandidates(items, 10, seeded(3)).map((i) => i.id);
    const b = selectCandidates(items, 10, seeded(3)).map((i) => i.id);
    const c = selectCandidates(items, 10, seeded(4)).map((i) => i.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});
