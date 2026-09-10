import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ENV, validateEnv } from "./env";

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })],
  providers: [{ provide: ENV, useFactory: () => validateEnv(process.env) }],
  exports: [ENV],
})
export class EnvModule {}
