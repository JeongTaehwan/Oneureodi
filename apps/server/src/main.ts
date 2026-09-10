import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { UpstreamErrorFilter } from "./common/upstream-error.filter";
import { ENV, Env } from "./config/env";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalFilters(new UpstreamErrorFilter());
  const env = app.get<Env>(ENV);
  // 폰(Expo Go)에서 같은 와이파이의 PC 로 붙어야 하므로 모든 인터페이스에 연다.
  await app.listen(env.PORT, "0.0.0.0");
  Logger.log(`listening on http://0.0.0.0:${env.PORT}`, "bootstrap");
}

void bootstrap();
