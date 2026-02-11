import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Plan } from '../entities/plan.entity';
import { Subscription } from '../entities/subscription.entity';
import { UsageRecord } from '../entities/usage-record.entity';
import { User } from '../entities/user.entity';
import { PlanType } from './enums/plan-type.enum';
import { SubscriptionStatus } from './enums/subscription-status.enum';
import { UsageAction } from './enums/usage-action.enum';
import {
  getPlanFeatures,
  PlanFeatureKey,
  PlanFeatures,
} from './plan-features.config';

const DEFAULT_PLAN_TYPES: PlanType[] = [
  PlanType.FREE,
  PlanType.PRO,
  PlanType.PREMIUM,
];

const TRIAL_DURATION_DAYS = 14;

const USAGE_ACTION_TO_PLAN_LIMIT: Record<UsageAction, keyof Plan> = {
  [UsageAction.RECIPE_GENERATION]: 'maxRecipeGenerationsPerDay',
  [UsageAction.RECIPE_PARSE]: 'maxParseRequestsPerDay',
  [UsageAction.RECIPE_SUGGEST]: 'maxRecipeGenerationsPerDay', // shares limit with generation
};

@Injectable()
export class SubscriptionService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(UsageRecord)
    private readonly usageRecordRepo: Repository<UsageRecord>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.seedPlans();
  }

  private async seedPlans() {
    for (const planType of DEFAULT_PLAN_TYPES) {
      const existing = await this.planRepo.findOne({
        where: { type: planType },
      });
      if (!existing) {
        await this.planRepo.save(this.planRepo.create({ type: planType }));
        this.logger.log(`Seeded plan: ${planType}`);
      }
    }
  }

  async getPlanByType(type: PlanType): Promise<Plan> {
    const plan = await this.planRepo.findOne({ where: { type } });
    if (!plan) {
      throw new NotFoundException(`Plan "${type}" not found`);
    }
    return plan;
  }

  async getSubscription(userId: string): Promise<Subscription> {
    let subscription = await this.subscriptionRepo.findOne({
      where: { userId },
      relations: ['plan'],
    });

    if (!subscription) {
      // Auto-create with free plan
      const freePlan = await this.getPlanByType(PlanType.FREE);
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      subscription = this.subscriptionRepo.create({
        user,
        userId,
        plan: freePlan,
        planId: freePlan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: null,
      });
      subscription = await this.subscriptionRepo.save(subscription);

      this.logger.log({ userId }, 'Created default subscription (free)');
    }

    return subscription;
  }

  async createTrialSubscription(userId: string): Promise<Subscription> {
    const proPlan = await this.getPlanByType(PlanType.PRO);

    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);

    const subscription = this.subscriptionRepo.create({
      userId,
      plan: proPlan,
      planId: proPlan.id,
      status: SubscriptionStatus.TRIAL,
      trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
    });

    const saved = await this.subscriptionRepo.save(subscription);
    this.logger.log(
      { userId, trialEndsAt: trialEndsAt.toISOString() },
      'Created trial subscription (pro)',
    );

    return saved;
  }

  getFeaturesForPlan(planType: PlanType): PlanFeatures {
    return getPlanFeatures(planType);
  }

  async checkFeature(
    userId: string,
    featureName: PlanFeatureKey,
  ): Promise<boolean> {
    const subscription = await this.getSubscription(userId);
    const features = getPlanFeatures(subscription.plan.type);
    return !!features[featureName];
  }

  async checkAndIncrementUsage(
    userId: string,
    action: UsageAction,
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    const subscription = await this.getSubscription(userId);
    const limitField = USAGE_ACTION_TO_PLAN_LIMIT[action];
    const limit = subscription.plan[limitField] as number;

    // 0 = unlimited
    if (limit === 0) {
      await this.incrementUsage(userId, action);
      const current = await this.getTodayUsage(userId, action);
      return { allowed: true, current, limit: 0 };
    }

    const current = await this.getTodayUsage(userId, action);

    if (current >= limit) {
      return { allowed: false, current, limit };
    }

    await this.incrementUsage(userId, action);
    return { allowed: true, current: current + 1, limit };
  }

  async requireFeature(
    userId: string,
    featureName: PlanFeatureKey,
  ): Promise<void> {
    const allowed = await this.checkFeature(userId, featureName);
    if (!allowed) {
      throw new ForbiddenException(
        `This feature requires a plan upgrade. Current plan does not include this feature.`,
      );
    }
  }

  async requireUsageLimit(userId: string, action: UsageAction): Promise<void> {
    const result = await this.checkAndIncrementUsage(userId, action);
    if (!result.allowed) {
      throw new ForbiddenException(
        `Daily limit reached (${result.current}/${result.limit}). Upgrade your plan for more.`,
      );
    }
  }

  async getUsageSummary(
    userId: string,
  ): Promise<{ action: UsageAction; current: number; limit: number }[]> {
    const subscription = await this.getSubscription(userId);
    const summary: { action: UsageAction; current: number; limit: number }[] =
      [];

    for (const action of Object.values(UsageAction)) {
      const limitField = USAGE_ACTION_TO_PLAN_LIMIT[action];
      const limit = subscription.plan[limitField] as number;
      const current = await this.getTodayUsage(userId, action);
      summary.push({ action, current, limit });
    }

    return summary;
  }

  async expireTrials(): Promise<number> {
    const now = new Date();
    const freePlan = await this.getPlanByType(PlanType.FREE);

    const expiredTrials = await this.subscriptionRepo.find({
      where: {
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: LessThan(now),
      },
    });

    for (const subscription of expiredTrials) {
      subscription.planId = freePlan.id;
      subscription.plan = freePlan;
      subscription.status = SubscriptionStatus.EXPIRED;
      subscription.currentPeriodEnd = null;
      await this.subscriptionRepo.save(subscription);
    }

    if (expiredTrials.length > 0) {
      this.logger.log(
        { count: expiredTrials.length },
        'Expired trial subscriptions downgraded to free',
      );
    }

    return expiredTrials.length;
  }

  private async getTodayUsage(
    userId: string,
    action: UsageAction,
  ): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const record = await this.usageRecordRepo.findOne({
      where: { userId, action, date: today },
    });
    return record?.count ?? 0;
  }

  private async incrementUsage(
    userId: string,
    action: UsageAction,
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    let record = await this.usageRecordRepo.findOne({
      where: { userId, action, date: today },
    });

    if (record) {
      record.count += 1;
    } else {
      record = this.usageRecordRepo.create({
        userId,
        action,
        date: today,
        count: 1,
      });
    }

    await this.usageRecordRepo.save(record);
  }
}
