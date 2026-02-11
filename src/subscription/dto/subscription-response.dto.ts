import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Subscription } from '../../entities/subscription.entity';
import { PlanType } from '../enums/plan-type.enum';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { getPlanFeatures } from '../plan-features.config';

class PlanFeaturesDto {
  @ApiProperty()
  canSuggestRecipes: boolean;

  @ApiProperty()
  canUseCustomCategories: boolean;

  @ApiProperty()
  canUsePreferences: boolean;

  @ApiProperty()
  canShareLists: boolean;

  @ApiProperty()
  canParseFromUrl: boolean;

  @ApiProperty()
  canParseFromPhoto: boolean;
}

class PlanDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: PlanType })
  type: PlanType;

  @ApiProperty()
  features: PlanFeaturesDto;

  @ApiProperty({ description: '0 = unlimited' })
  maxRecipeGenerationsPerDay: number;

  @ApiProperty({ description: '0 = unlimited' })
  maxParseRequestsPerDay: number;

  @ApiProperty({ description: '0 = unlimited' })
  maxShoppingLists: number;

  @ApiProperty({ description: '0 = unlimited' })
  maxCustomCategories: number;
}

export class SubscriptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @ApiProperty()
  plan: PlanDto;

  @ApiPropertyOptional()
  trialEndsAt: Date | null;

  @ApiProperty()
  currentPeriodStart: Date;

  @ApiPropertyOptional()
  currentPeriodEnd: Date | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(subscription: Subscription): SubscriptionResponseDto {
    const dto = new SubscriptionResponseDto();
    dto.id = subscription.id;
    dto.status = subscription.status;
    dto.trialEndsAt = subscription.trialEndsAt;
    dto.currentPeriodStart = subscription.currentPeriodStart;
    dto.currentPeriodEnd = subscription.currentPeriodEnd;
    dto.createdAt = subscription.createdAt;

    const plan = new PlanDto();
    plan.id = subscription.plan.id;
    plan.type = subscription.plan.type;
    plan.features = getPlanFeatures(subscription.plan.type);
    plan.maxRecipeGenerationsPerDay = subscription.plan.maxRecipeGenerationsPerDay;
    plan.maxParseRequestsPerDay = subscription.plan.maxParseRequestsPerDay;
    plan.maxShoppingLists = subscription.plan.maxShoppingLists;
    plan.maxCustomCategories = subscription.plan.maxCustomCategories;
    dto.plan = plan;

    return dto;
  }
}
