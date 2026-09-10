import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { ClockModule } from "./common/clock";
import { EnvModule } from "./config/env.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RecommendModule } from "./recommend/recommend.module";

@Module({
  imports: [EnvModule, ClockModule, PrismaModule, ScheduleModule.forRoot(), RecommendModule],
})
export class AppModule {}
