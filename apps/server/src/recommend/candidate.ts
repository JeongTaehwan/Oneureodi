import type { MentionCounts, Parking } from "@oneureodi/shared";
import type { AreaSnapshot } from "../places/places.repository";

/** 필터·LLM 에 넘기는 장소 한 건. 언급은 장소별로 접어 넣는다. */
export interface Candidate {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  lat: number;
  lng: number;
  url: string | null;
  parking: Parking;
  priceHintKrw: number | null;
  hints: string[];
  /** 이 장소를 언급한 웹 글 수 (주소 기준 중복 제거) */
  mentionCount: number;
  mentionCounts: MentionCounts;
}

const MAX_HINTS = 3;

export function buildCandidates(snapshot: AreaSnapshot): Candidate[] {
  const links = new Map<string, Map<string, MentionCounts[keyof MentionCounts] extends number ? string : never>>();
  const hints = new Map<string, string[]>();
  for (const m of snapshot.mentions) {
    // 주소 → 출처 종류. 같은 글은 한 번만 센다.
    const byUrl = links.get(m.placeId) ?? new Map<string, string>();
    byUrl.set(m.sourceUrl, m.sourceKind);
    links.set(m.placeId, byUrl);
    if (m.hint) {
      const arr = hints.get(m.placeId) ?? [];
      if (!arr.includes(m.hint) && arr.length < MAX_HINTS) arr.push(m.hint);
      hints.set(m.placeId, arr);
    }
  }
  return snapshot.places.map((p) => {
    const counts: MentionCounts = { blog: 0, instagram: 0, web: 0 };
    for (const kind of links.get(p.id)?.values() ?? []) {
      if (kind === "blog" || kind === "instagram") counts[kind] += 1;
      else counts.web += 1;
    }
    return {
    id: p.id,
    name: p.name,
    category: p.category,
    address: p.roadAddress ?? p.address,
    lat: p.lat,
    lng: p.lng,
    url: p.url,
    parking: p.parking,
    priceHintKrw: p.priceHintKrw,
    hints: hints.get(p.id) ?? [],
    mentionCount: counts.blog + counts.instagram + counts.web,
    mentionCounts: counts,
    };
  });
}
