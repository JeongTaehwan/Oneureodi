import { Module } from "@nestjs/common";
import { KakaoLocalClient } from "./kakao-local.client";
import { TavilyClient } from "./tavily.client";

@Module({
  providers: [KakaoLocalClient, TavilyClient],
  exports: [KakaoLocalClient, TavilyClient],
})
export class CollectorsModule {}
