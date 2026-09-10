import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Clock } from "../common/clock";
import { ENV, Env, cacheTtlMs } from "../config/env";
import { PlacesRepository } from "./places.repository";

/** "일주일 지나면 없애자" — 읽을 때는 isFresh 로 무시하고, 여기서 실제로 지운다. */
@Injectable()
export class CleanupService {
  private readonly log = new Logger(CleanupService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly clock: Clock,
    private readonly repo: PlacesRepository,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async run(): Promise<void> {
    const before = new Date(this.clock.now().getTime() - cacheTtlMs(this.env));
    const result = await this.repo.deleteExpired(before);
    this.log.log(`만료 삭제: areas=${result.areas} places=${result.places} (before ${before.toISOString()})`);
  }
}
