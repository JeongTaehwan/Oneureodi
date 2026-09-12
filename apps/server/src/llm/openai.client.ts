import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { UpstreamError } from "../common/http";
import { type GroundedInput, type GroundedResult, type GroundedSource, insertCitationMarkers, type JsonInput, LlmClient } from "./llm-client";

export interface OpenAiClientOptions {
  apiKey: string;
  timeoutMs: number;
  toolTimeoutMs: number;
}

export class OpenAiClient extends LlmClient {
  readonly provider = "openai";
  private readonly client: OpenAI;

  constructor(private readonly opts: OpenAiClientOptions) {
    super();
    this.client = new OpenAI({ apiKey: opts.apiKey });
  }

  async generateJson<T>(input: JsonInput<T>): Promise<T> {
    try {
      const res = await this.client.responses.parse(
        {
          model: input.model,
          input: [
            { role: "system", content: input.system },
            { role: "user", content: input.user },
          ],
          text: { format: zodTextFormat(input.schema, input.name) },
        },
        { timeout: input.timeoutMs ?? this.opts.timeoutMs },
      );
      const parsed = res.output_parsed;
      if (parsed === null || parsed === undefined) throw new UpstreamError("openai", null, `빈 응답 (${input.name})`);
      return parsed as T;
    } catch (err) {
      throw toUpstream(err);
    }
  }

  async generateGrounded(input: GroundedInput): Promise<GroundedResult> {
    try {
      const res = await this.client.responses.create(
        {
          model: input.model,
          input: [
            { role: "system", content: input.system },
            { role: "user", content: input.user },
          ],
          tools: [{ type: "web_search", user_location: { type: "approximate", country: "KR" } }],
        },
        { timeout: this.opts.toolTimeoutMs },
      );
      const sources: GroundedSource[] = [];
      const indexByUrl = new Map<string, number>();
      let text = "";
      for (const item of res.output) {
        if (item.type !== "message") continue;
        for (const part of item.content) {
          if (part.type !== "output_text") continue;
          const spans: { end: number; sourceIndexes: number[] }[] = [];
          for (const a of part.annotations) {
            if (a.type !== "url_citation") continue;
            let idx = indexByUrl.get(a.url);
            if (idx === undefined) {
              sources.push({ url: a.url, title: a.title });
              idx = sources.length;
              indexByUrl.set(a.url, idx);
            }
            spans.push({ end: a.end_index, sourceIndexes: [idx] });
          }
          text += insertCitationMarkers(part.text, spans);
        }
      }
      return { text, sources };
    } catch (err) {
      throw toUpstream(err);
    }
  }
}

function toUpstream(err: unknown): UpstreamError {
  if (err instanceof UpstreamError) return err;
  const status = err instanceof OpenAI.APIError ? err.status ?? null : null;
  return new UpstreamError("openai", status, err instanceof Error ? err.message : String(err));
}
