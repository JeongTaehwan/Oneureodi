import type { Parking } from "@oneureodi/shared";
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
}

const MAX_HINTS = 3;

export function buildCandidates(snapshot: AreaSnapshot): Candidate[] {
  const links = new Map<string, Set<string>>();
  const hints = new Map<string, string[]>();
  for (const m of snapshot.mentions) {
    const set = links.get(m.placeId) ?? new Set<string>();
    set.add(m.sourceUrl);
    links.set(m.placeId, set);
    if (m.hint) {
      const arr = hints.get(m.placeId) ?? [];
      if (!arr.includes(m.hint) && arr.length < MAX_HINTS) arr.push(m.hint);
      hints.set(m.placeId, arr);
    }
  }
  return snapshot.places.map((p) => ({
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
    mentionCount: links.get(p.id)?.size ?? 0,
  }));
}
