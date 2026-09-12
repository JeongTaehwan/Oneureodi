import type { Parking, SourceKind } from "@oneureodi/shared";
import { namesMatch } from "../common/text";

/** 웹 글에서 뽑은 장소 언급 하나 */
export interface ExtractedMention {
  placeName: string;
  hint: string | null;
  priceHintKrw: number | null;
  parking: Parking;
  sourceKind: SourceKind;
  sourceUrl: string;
  sourceTitle: string;
  publishedAt: Date | null;
}

export interface MatchablePlace {
  id: string;
  name: string;
}

export interface MatchedMention extends ExtractedMention {
  placeId: string;
}

export interface MatchResult {
  matched: MatchedMention[];
  /** 지도 결과에 없던 상호(중복 제거, 등장 순) */
  unmatchedNames: string[];
}

/** 언급을 이름으로 장소에 붙인다. 후보가 여럿이면 이름이 가장 긴(가장 구체적인) 것을 고른다. */
export function matchMentions(mentions: readonly ExtractedMention[], places: readonly MatchablePlace[]): MatchResult {
  const matched: MatchedMention[] = [];
  const unmatched: string[] = [];
  const seenUnmatched = new Set<string>();
  for (const m of mentions) {
    const candidates = places.filter((p) => namesMatch(p.name, m.placeName));
    const best = candidates.sort((a, b) => b.name.length - a.name.length)[0];
    if (best) {
      matched.push({ ...m, placeId: best.id });
    } else {
      const key = m.placeName.trim();
      if (key && !seenUnmatched.has(key)) {
        seenUnmatched.add(key);
        unmatched.push(key);
      }
    }
  }
  return { matched, unmatchedNames: unmatched };
}

/** 여러 언급의 주차 정보를 하나로. 하나라도 yes 면 yes, 아니면 no 가 있으면 no, 아니면 unknown. */
export function deriveParking(values: readonly Parking[]): Parking {
  if (values.includes("yes")) return "yes";
  if (values.includes("no")) return "no";
  return "unknown";
}

/** 여러 언급의 가격 힌트를 하나로. 중앙값. 없으면 null. */
export function derivePrice(values: readonly (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null && Number.isFinite(v) && v >= 0).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  if (nums.length % 2 === 1) return nums[mid] as number;
  return Math.round(((nums[mid - 1] as number) + (nums[mid] as number)) / 2);
}
