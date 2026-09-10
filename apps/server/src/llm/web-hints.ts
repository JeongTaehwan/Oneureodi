import { Injectable, Logger } from "@nestjs/common";
import { z } from "zod";
import type { GeoPoint } from "../collectors/types";
import { TavilyClient, type WebSearchResult } from "../collectors/tavily.client";
import type { ExtractedMention } from "../places/mention-match";
import { type GroundedSource, LlmClient } from "./llm-client";
import { LlmModels } from "./llm-models";

const MentionSchema = z.object({
  placeName: z.string(),
  hint: z.string().nullable(),
  priceHintKrw: z.number().int().nullable(),
  parking: z.enum(["yes", "no", "unknown"]),
  /** 조사 본문의 "[n]" 표시에서 가져온 출처 번호(1부터). 없으면 빈 배열 */
  sourceIndexes: z.array(z.number().int()),
});

const WebHintsSchema = z.object({
  mentions: z.array(MentionSchema),
});

/** 한 지역당 모으는 언급 상한. */
const MAX_MENTIONS = 60;

const RESEARCH_SYSTEM = `너는 데이트 코스 조사원이다. 웹 검색으로 주어진 지역의 데이트 코스 추천 글(블로그, 매거진, 커뮤니티)을 찾아 읽는다.
"{지역} 데이트 코스", "{지역} 데이트 맛집 카페", "{지역} 가볼만한곳" 처럼 검색을 여러 번 해서 글을 최대한 많이 모은다.
그리고 글에 언급된 구체적인 상호(카페·식당·전시·공방·공원 등 실제로 방문할 수 있는 이름)를 한 줄에 하나씩 정리한다.
각 줄: 상호 — 어떤 곳인지 한 줄 — 가격 언급(있으면, 1인 기준) — 주차 언급(있으면).
지역명·역 이름·동네 이름·브랜드명만 있는 것("스타벅스")은 장소가 아니다. 글에서 본 것만 쓰고 지어내지 않는다.`;

const EXTRACT_SYSTEM = `아래 조사 본문에서 장소 언급을 JSON 으로 뽑는다. 본문 곳곳의 "[n]" 은 출처 번호다.
규칙:
- placeName: 구체적인 상호만. 지역명·역·동네·브랜드명만 있는 것은 제외.
- hint: 그 장소의 분위기나 특징을 20자 이내 한 줄. 없으면 null.
- priceHintKrw: 본문에 그 장소의 가격이 있으면 1인 기준 원 단위 정수. 없으면 null.
- parking: 주차 가능 언급이면 "yes", 주차 불가·어렵다는 언급이면 "no", 언급 없으면 "unknown".
- sourceIndexes: 그 장소가 나온 글의 "[n]" 번호들. 없으면 빈 배열.
- 같은 장소가 여러 출처에 나오면 출처마다 한 건씩 넣는다 (언급 수가 인기 신호가 된다).
- 최대 ${MAX_MENTIONS}건. 본문에 없는 것은 넣지 않는다.`;

/** 검색 질의. 지역당 3회 → Tavily 무료 크레딧 3개. */
export function searchQueries(locationName: string): string[] {
  return [`${locationName} 데이트 코스`, `${locationName} 데이트 카페 맛집`, `${locationName} 가볼만한곳`];
}

/** 검색 결과를 "[n] 제목\n본문" 형태의 조사 본문으로 만든다. 같은 URL 은 한 번만. */
export function buildResearchText(results: readonly WebSearchResult[]): { text: string; sources: GroundedSource[] } {
  const sources: GroundedSource[] = [];
  const blocks: string[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (!r.url || seen.has(r.url)) continue;
    seen.add(r.url);
    sources.push({ url: r.url, title: r.title || r.url, publishedAt: r.publishedAt });
    blocks.push(`[${sources.length}] ${r.title}\n${r.content.trim()}`);
  }
  return { text: blocks.join("\n\n"), sources };
}

/**
 * "코스 추천 글"을 찾아 장소·힌트를 뽑는다. 두 단계:
 * 1) 검색 — Tavily 키가 있으면 Tavily(카드 없이 월 1,000회), 없으면 LLM 의 웹검색 그라운딩
 * 2) 구조화 — 검색 본문을 LLM 이 JSON 으로 변환 (출처 번호 포함)
 */
@Injectable()
export class WebHintCollector {
  private readonly log = new Logger(WebHintCollector.name);

  constructor(
    private readonly llm: LlmClient,
    private readonly models: LlmModels,
    private readonly tavily: TavilyClient,
  ) {}

  async collect(locationName: string, near?: GeoPoint): Promise<ExtractedMention[]> {
    const research = this.tavily.enabled ? await this.searchWithTavily(locationName) : await this.searchWithLlm(locationName, near);
    if (!research.text.trim()) return [];

    const sourceList = research.sources.map((s, i) => `[${i + 1}] ${s.title} ${s.url}`).join("\n");
    const extracted = await this.llm.generateJson({
      model: this.models.search,
      system: EXTRACT_SYSTEM,
      user: `출처 목록:\n${sourceList || "(없음)"}\n\n조사 본문:\n${research.text}`,
      schema: WebHintsSchema,
      name: "web_hints",
    });

    const mentions: ExtractedMention[] = [];
    let unsourced = 0;
    for (const m of extracted.mentions.slice(0, MAX_MENTIONS)) {
      const name = m.placeName.trim();
      if (!name) continue;
      const source = m.sourceIndexes.map((i) => research.sources[i - 1]).find((s) => s && s.url);
      if (!source) unsourced++;
      mentions.push({
        placeName: name,
        hint: m.hint,
        priceHintKrw: m.priceHintKrw,
        parking: m.parking,
        // 출처를 못 찾은 언급은 빈 주소로 남긴다. 장소당 한 건으로 접히고(unique), 지어낸 주소는 넣지 않는다.
        sourceUrl: source?.url ?? "",
        sourceTitle: source?.title ?? "출처 미상",
        publishedAt: source?.publishedAt ?? null,
      });
    }
    this.log.log(`[${locationName}] search=${this.tavily.enabled ? "tavily" : this.llm.provider} sources=${research.sources.length} mentions=${mentions.length} unsourced=${unsourced}`);
    return mentions;
  }

  private async searchWithTavily(locationName: string) {
    const pages = await Promise.all(
      searchQueries(locationName).map((q) =>
        this.tavily.search(q).catch((err: unknown) => {
          this.log.warn(`tavily "${q}" 실패: ${err instanceof Error ? err.message : String(err)}`);
          return [] as WebSearchResult[];
        }),
      ),
    );
    return buildResearchText(pages.flat());
  }

  private searchWithLlm(locationName: string, near?: GeoPoint) {
    return this.llm.generateGrounded({ model: this.models.search, system: RESEARCH_SYSTEM, user: `지역: ${locationName}`, near });
  }
}
