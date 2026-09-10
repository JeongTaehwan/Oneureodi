import type { ZodType } from "zod";
import type { GeoPoint } from "../collectors/types";

export interface JsonInput<T> {
  model: string;
  system: string;
  user: string;
  schema: ZodType<T>;
  /** 스키마 이름. 제공자에 따라 요청에 실리기도 하고 로그에만 쓰이기도 한다. */
  name: string;
}

export interface GroundedInput {
  model: string;
  system: string;
  user: string;
  /** 검색 결과를 이 좌표 근처로 편향시킨다 */
  near?: GeoPoint;
}

export interface GroundedSource {
  url: string;
  title: string;
  publishedAt?: Date | null;
}

export interface GroundedResult {
  /** 모델이 쓴 본문. 출처를 가리키는 자리에 "[n]" 표시가 들어간다 (n 은 sources 의 1부터 시작하는 번호). */
  text: string;
  sources: GroundedSource[];
}

/** LLM 제공자 추상화. 구조화 출력 한 번, 웹검색 그라운딩 한 번 — 이 둘만 있으면 파이프라인이 돈다. */
export abstract class LlmClient {
  abstract readonly provider: string;
  abstract generateJson<T>(input: JsonInput<T>): Promise<T>;
  abstract generateGrounded(input: GroundedInput): Promise<GroundedResult>;
}

/** 본문에 "[n]" 출처 표시를 끼워 넣는다. spans 는 문자 인덱스 기준, end 위치 뒤에 표시를 붙인다. */
export function insertCitationMarkers(text: string, spans: readonly { end: number; sourceIndexes: readonly number[] }[]): string {
  const sorted = [...spans].filter((s) => s.sourceIndexes.length > 0).sort((a, b) => b.end - a.end);
  let out = text;
  for (const s of sorted) {
    const end = Math.min(Math.max(s.end, 0), out.length);
    out = `${out.slice(0, end)}[${s.sourceIndexes.join(",")}]${out.slice(end)}`;
  }
  return out;
}
