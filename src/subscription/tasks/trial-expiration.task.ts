import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionService } from '../subscription.service';

@Injectable()
export class TrialExpirationTask {
  constructor(
    @InjectPinoLogger(TrialExpirationTask.name)
    private readonly logger: PinoLogger,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredTrials() {
    this.logger.info('Checking for expired trial subscriptions...');
    const count = await this.subscriptionService.expireTrials();
    if (count > 0) {
      this.logger.info(`Downgraded ${count} expired trial(s) to free plan`);
    }
  }
}
