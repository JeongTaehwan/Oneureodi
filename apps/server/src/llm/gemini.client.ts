import { Logger } from "@nestjs/common";
import { ApiError, GoogleGenAI, ThinkingLevel, type GenerateContentResponse } from "@google/genai";
import { z } from "zod";
import { UpstreamError } from "../common/http";
import { type GroundedInput, type GroundedResult, type GroundedSource, type JsonInput, LlmClient } from "./llm-client";

export interface GeminiClientOptions {
  apiKey: string;
  timeoutMs: number;
  toolTimeoutMs: number;
  /** 주 모델이 과부하(503)·쿼터(429)면 이 모델로 한 번 더 */
  fallbackModel: string | null;
}

/** 503 은 몇 초 뒤 되는 경우가 많다. 1초, 2초 두 번만 더 해본다. */
const RETRY = { attempts: 3, initialDelay: 1, maxDelay: 3, expBase: 2, jitter: 0.3, httpStatusCodes: [503] };

/** Google AI Studio 키로 쓰는 Gemini. 무료 등급에 Google 검색 그라운딩이 포함된다. */
export class GeminiClient extends LlmClient {
  readonly provider = "gemini";
  private readonly log = new Logger(GeminiClient.name);
  private readonly ai: GoogleGenAI;

  constructor(private readonly opts: GeminiClientOptions) {
    super();
    this.ai = new GoogleGenAI({ apiKey: opts.apiKey, httpOptions: { retryOptions: RETRY } });
  }

  async generateJson<T>(input: JsonInput<T>): Promise<T> {
    try {
      return await this.generateJsonWith(input.model, input);
    } catch (err) {
      const fallback = this.opts.fallbackModel;
      if (!fallback || fallback === input.model || !(err instanceof UpstreamError) || !isOverloaded(err)) throw err;
      return this.generateJsonWith(fallback, input);
    }
  }

  private async generateJsonWith<T>(model: string, input: JsonInput<T>): Promise<T> {
    let res: GenerateContentResponse;
    const started = Date.now();
    try {
      res = await this.ai.models.generateContent({
        model,
        contents: input.user,
        config: {
          systemInstruction: input.system,
          responseMimeType: "application/json",
          responseJsonSchema: toGeminiJsonSchema(input.schema),
          // 기본값(동적 thinking)은 후보 60개 코스 구성에 15초 넘게 걸렸다. 추출·구성은 최소 thinking 으로.
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          abortSignal: AbortSignal.timeout(input.timeoutMs ?? this.opts.timeoutMs),
        },
      });
    } catch (err) {
      this.log.warn(`${model} ${input.name} 실패 ${Date.now() - started}ms: ${err instanceof Error ? err.message.slice(0, 120) : String(err)}`);
      throw toUpstream(err);
    }
    this.log.log(`${model} ${input.name} ${Date.now() - started}ms in=${res.usageMetadata?.promptTokenCount ?? "?"} out=${res.usageMetadata?.candidatesTokenCount ?? "?"} think=${res.usageMetadata?.thoughtsTokenCount ?? 0}`);
    const text = res.text;
    if (!text) throw new UpstreamError("gemini", null, `빈 응답 (${input.name})`);
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new UpstreamError("gemini", null, `JSON 아님 (${input.name}): ${text.slice(0, 120)}`);
    }
    const parsed = input.schema.safeParse(raw);
    if (!parsed.success) throw new UpstreamError("gemini", null, `스키마 불일치 (${input.name}): ${parsed.error.issues[0]?.message ?? ""}`);
    return parsed.data;
  }

  async generateGrounded(input: GroundedInput): Promise<GroundedResult> {
    let res: GenerateContentResponse;
    try {
      res = await this.ai.models.generateContent({
        model: input.model,
        contents: input.user,
        config: {
          systemInstruction: input.system,
          tools: [{ googleSearch: {} }],
          toolConfig: input.near ? { retrievalConfig: { latLng: { latitude: input.near.lat, longitude: input.near.lng } } } : undefined,
          abortSignal: AbortSignal.timeout(this.opts.toolTimeoutMs),
        },
      });
    } catch (err) {
      throw toUpstream(err);
    }
    const candidate = res.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const meta = candidate?.groundingMetadata;
    const sources: GroundedSource[] = (meta?.groundingChunks ?? []).map((c) => ({
      url: c.web?.uri ?? "",
      title: c.web?.title ?? c.web?.uri ?? "",
    }));
    // groundingSupports 의 segment 는 part 안의 "바이트" 오프셋이다. 문자열이 아니라 Buffer 위에서 끼워 넣는다.
    const spansByPart = new Map<number, { end: number; sourceIndexes: number[] }[]>();
    for (const s of meta?.groundingSupports ?? []) {
      const end = s.segment?.endIndex;
      const idx = (s.groundingChunkIndices ?? []).map((i) => i + 1);
      if (end === undefined || idx.length === 0) continue;
      const partIndex = s.segment?.partIndex ?? 0;
      const arr = spansByPart.get(partIndex) ?? [];
      arr.push({ end, sourceIndexes: idx });
      spansByPart.set(partIndex, arr);
    }
    const text = parts
      .map((p, i) => (p.text ? insertMarkersByByteOffset(p.text, spansByPart.get(i) ?? []) : ""))
      .join("");
    return { text, sources };
  }
}

/** zod → Gemini 가 받는 JSON Schema. $schema 는 빼고, nullable 은 anyOf 로 나가는데 Gemini 가 지원한다. */
export function toGeminiJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-07" }) as Record<string, unknown>;
  delete json["$schema"];
  return json;
}

export function insertMarkersByByteOffset(text: string, spans: readonly { end: number; sourceIndexes: readonly number[] }[]): string {
  let buf = Buffer.from(text, "utf8");
  const sorted = [...spans].sort((a, b) => b.end - a.end);
  for (const s of sorted) {
    const end = Math.min(Math.max(s.end, 0), buf.length);
    buf = Buffer.concat([buf.subarray(0, end), Buffer.from(`[${s.sourceIndexes.join(",")}]`, "utf8"), buf.subarray(end)]);
  }
  return buf.toString("utf8");
}

/** 과부하(503), 쿼터(429), 그리고 응답이 제한 시간 안에 안 온 경우. 셋 다 "다른 모델이면 될 수 있다"는 뜻이다. */
function isOverloaded(err: UpstreamError): boolean {
  return err.status === 503 || err.status === 429 || err.message.includes("timeout");
}

function toUpstream(err: unknown): UpstreamError {
  if (err instanceof UpstreamError) return err;
  if (err instanceof ApiError) return new UpstreamError("gemini", err.status, err.message);
  const isAbort = err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
  return new UpstreamError("gemini", null, isAbort ? "timeout" : err instanceof Error ? err.message : String(err));
}
