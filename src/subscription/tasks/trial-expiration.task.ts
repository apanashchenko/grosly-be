import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionService } from '../subscription.service';

@Injectable()
export class TrialExpirationTask {
  private readonly logger = new Logger(TrialExpirationTask.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredTrials() {
    this.logger.debug('Checking for expired trial subscriptions...');
    const count = await this.subscriptionService.expireTrials();
    if (count > 0) {
      this.logger.log(`Downgraded ${count} expired trial(s) to free plan`);
    }
  }
}
