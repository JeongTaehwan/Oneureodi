import { Module } from "@nestjs/common";
import { CollectorsModule } from "../collectors/collectors.module";
import { LlmModule } from "../llm/llm.module";
import { PlacesModule } from "../places/places.module";
import { RecommendController } from "./recommend.controller";
import { RecommendService } from "./recommend.service";

@Module({
  imports: [CollectorsModule, PlacesModule, LlmModule],
  controllers: [RecommendController],
  providers: [RecommendService],
})
export class RecommendModule {}
