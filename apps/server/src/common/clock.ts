import { Global, Injectable, Module } from "@nestjs/common";

/** 시각은 밖에서 주입한다. 만료 판정 테스트가 CI 시각에 흔들리지 않게. */
export abstract class Clock {
  abstract now(): Date;
}

@Injectable()
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}

@Global()
@Module({
  providers: [{ provide: Clock, useClass: SystemClock }],
  exports: [Clock],
})
export class ClockModule {}
