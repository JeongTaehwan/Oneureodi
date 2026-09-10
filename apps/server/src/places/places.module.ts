import { Module } from "@nestjs/common";
import { CollectorsModule } from "../collectors/collectors.module";
import { LlmModule } from "../llm/llm.module";
import { AreaCacheService } from "./area-cache.service";
import { CleanupService } from "./cleanup.service";
import { PlacesRepository } from "./places.repository";

@Module({
  imports: [CollectorsModule, LlmModule],
  providers: [PlacesRepository, AreaCacheService, CleanupService],
  exports: [AreaCacheService],
})
export class PlacesModule {}
