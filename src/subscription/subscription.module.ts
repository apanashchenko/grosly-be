import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { TrialExpirationTask } from './tasks/trial-expiration.task';
import { Plan } from '../entities/plan.entity';
import { Subscription } from '../entities/subscription.entity';
import { UsageRecord } from '../entities/usage-record.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Plan, Subscription, UsageRecord, User])],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, TrialExpirationTask],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
