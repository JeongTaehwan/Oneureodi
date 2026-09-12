import { z } from "zod";

const EnvSchema = z
  .object({
    PORT: z.coerce.number().int().default(3000),
    DATABASE_URL: z.string().min(1),
    KAKAO_REST_API_KEY: z.string().min(1),
    /** 있으면 웹검색을 Tavily 로 한다 (카드 없이 월 1,000회). 없으면 LLM 의 웹검색 그라운딩을 쓴다. */
    TAVILY_API_KEY: z.string().default(""),

    /** gemini: 카드 없이 무료 등급. openai: 크레딧 충전 필요. */
    LLM_PROVIDER: z.enum(["gemini", "openai"]).default("gemini"),
    GEMINI_API_KEY: z.string().default(""),
    GEMINI_SEARCH_MODEL: z.string().default("gemini-3.5-flash"),
    GEMINI_COMPOSE_MODEL: z.string().default("gemini-3.5-flash"),
    /** 주 모델이 503/429 를 내면 이걸로 한 번 더. 빈 값이면 대체 없음 */
    GEMINI_FALLBACK_MODEL: z.string().default("gemini-3.1-flash-lite"),
    OPENAI_API_KEY: z.string().default(""),
    OPENAI_SEARCH_MODEL: z.string().default(""),
    OPENAI_COMPOSE_MODEL: z.string().default(""),

    CAR_RADIUS_M: z.coerce.number().int().positive().default(5000),
    NO_CAR_RADIUS_M: z.coerce.number().int().positive().default(3000),
    CACHE_TTL_DAYS: z.coerce.number().positive().default(7),
    EXTERNAL_TIMEOUT_MS: z.coerce.number().int().positive().default(4000),
    LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
    LLM_TOOL_TIMEOUT_MS: z.coerce.number().int().positive().default(40000),
    MAX_LLM_CANDIDATES: z.coerce.number().int().positive().default(60),
    MAX_MENTION_LOOKUPS: z.coerce.number().int().min(0).default(20),
    /** 차 있을 때 장소 주변 주차장을 찾는 반경(m) */
    PARKING_RADIUS_M: z.coerce.number().int().positive().default(300),
  })
  .superRefine((env, ctx) => {
    const required = env.LLM_PROVIDER === "openai" ? ["OPENAI_API_KEY", "OPENAI_SEARCH_MODEL", "OPENAI_COMPOSE_MODEL"] : ["GEMINI_API_KEY"];
    for (const key of required) {
      if (!env[key as keyof typeof env]) {
        ctx.addIssue({ code: "custom", path: [key], message: `LLM_PROVIDER=${env.LLM_PROVIDER} 이면 필수` });
      }
    }
  });

export type Env = z.infer<typeof EnvSchema>;

export const ENV = Symbol("ENV");

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
    throw new Error(`환경변수 검증 실패 (.env 확인):\n${lines.join("\n")}`);
  }
  return result.data;
}

export function cacheTtlMs(env: Env): number {
  return Math.round(env.CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
}
