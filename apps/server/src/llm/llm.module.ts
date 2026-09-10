import { Module } from "@nestjs/common";
import { CollectorsModule } from "../collectors/collectors.module";
import { ENV, Env } from "../config/env";
import { CourseComposer } from "./compose-courses";
import { GeminiClient } from "./gemini.client";
import { LlmClient } from "./llm-client";
import { LlmModels } from "./llm-models";
import { OpenAiClient } from "./openai.client";
import { WebHintCollector } from "./web-hints";

/** LLM_PROVIDER 로 제공자를 고른다. 기본은 카드 없이 무료 등급을 주는 Gemini. */
@Module({
  imports: [CollectorsModule],
  providers: [
    {
      provide: LlmClient,
      inject: [ENV],
      useFactory: (env: Env): LlmClient =>
        env.LLM_PROVIDER === "openai"
          ? new OpenAiClient({ apiKey: env.OPENAI_API_KEY, timeoutMs: env.LLM_TIMEOUT_MS, toolTimeoutMs: env.LLM_TOOL_TIMEOUT_MS })
          : new GeminiClient({ apiKey: env.GEMINI_API_KEY, timeoutMs: env.LLM_TIMEOUT_MS, toolTimeoutMs: env.LLM_TOOL_TIMEOUT_MS, fallbackModel: env.GEMINI_FALLBACK_MODEL || null }),
    },
    {
      provide: LlmModels,
      inject: [ENV],
      useFactory: (env: Env): LlmModels =>
        env.LLM_PROVIDER === "openai"
          ? new LlmModels(env.OPENAI_SEARCH_MODEL, env.OPENAI_COMPOSE_MODEL)
          : new LlmModels(env.GEMINI_SEARCH_MODEL, env.GEMINI_COMPOSE_MODEL),
    },
    WebHintCollector,
    CourseComposer,
  ],
  exports: [WebHintCollector, CourseComposer],
})
export class LlmModule {}
