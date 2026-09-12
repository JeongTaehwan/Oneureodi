import { Module } from "@nestjs/common";
import { KakaoLocalClient } from "./kakao-local.client";
import { KakaoRoutingClient } from "./kakao-routing.client";
import { TavilyClient } from "./tavily.client";

@Module({
  providers: [KakaoLocalClient, KakaoRoutingClient, TavilyClient],
  exports: [KakaoLocalClient, KakaoRoutingClient, TavilyClient],
})
export class CollectorsModule {}
