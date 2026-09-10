import { Inject, Injectable } from "@nestjs/common";
import { ENV, Env } from "../config/env";
import { UpstreamError } from "../common/http";

export interface WebSearchResult {
  title: string;
  url: string;
  content: string;
  publishedAt: Date | null;
}

interface TavilyResponse {
  results: { title: string; url: string; content: string; published_date?: string | null }[];
}

const ENDPOINT = "https://api.tavily.com/search";
/** 질의당 결과 수. basic 검색은 결과 수와 무관하게 1 크레딧. 무료 플랜 월 1,000 크레딧. */
const MAX_RESULTS = 10;

/** 카드 없이 월 1,000회 주는 검색 API. LLM 그라운딩이 무료 등급에서 막힐 때의 검색 소스. */
@Injectable()
export class TavilyClient {
  constructor(@Inject(ENV) private readonly env: Env) {}

  get enabled(): boolean {
    return this.env.TAVILY_API_KEY.length > 0;
  }

  async search(query: string): Promise<WebSearchResult[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.env.EXTERNAL_TIMEOUT_MS * 2);
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.env.TAVILY_API_KEY}` },
        body: JSON.stringify({ query, search_depth: "basic", max_results: MAX_RESULTS, include_published_date: true }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new UpstreamError("tavily", res.status, `HTTP ${res.status} ${body.slice(0, 200)}`);
      }
      const json = (await res.json()) as TavilyResponse;
      return (json.results ?? []).map((r) => ({
        title: r.title ?? "",
        url: r.url ?? "",
        content: r.content ?? "",
        publishedAt: parseDate(r.published_date ?? null),
      }));
    } catch (err) {
      if (err instanceof UpstreamError) throw err;
      const isAbort = err instanceof Error && err.name === "AbortError";
      throw new UpstreamError("tavily", null, isAbort ? "timeout" : err instanceof Error ? err.message : String(err));
    } finally {
      clearTimeout(timer);
    }
  }
}

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
