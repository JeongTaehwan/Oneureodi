/**
 * LLM 에 넘길 후보를 상한 안으로 줄인다.
 * 언급 많은 순으로 70% 를 채우고 나머지는 무작위로 뽑아 매번 다른 조합이 나오게 한다.
 * rng 를 밖에서 받아 테스트에서 고정할 수 있게 둔다.
 */
export function selectCandidates<T extends { mentionCount: number }>(
  items: readonly T[],
  max: number,
  rng: () => number = Math.random,
): T[] {
  if (items.length <= max) return shuffle([...items], rng);
  const sorted = [...items].sort((a, b) => b.mentionCount - a.mentionCount);
  const topCount = Math.floor(max * 0.7);
  const top = sorted.slice(0, topCount);
  const rest = shuffle(sorted.slice(topCount), rng).slice(0, max - topCount);
  return shuffle([...top, ...rest], rng);
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = tmp;
  }
  return arr;
}
