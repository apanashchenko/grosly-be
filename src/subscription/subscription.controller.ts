import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { UsageSummaryDto } from './dto/usage-summary.dto';
import { CurrentUser } from '../auth/decorators';
import { User } from '../entities/user.entity';

@ApiTags('subscription')
@ApiBearerAuth()
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @ApiOperation({
    summary: 'Get current subscription',
    description:
      "Returns the authenticated user's subscription details including plan features and limits.",
  })
  @ApiResponse({
    status: 200,
    description: 'Current subscription',
    type: SubscriptionResponseDto,
  })
  async getSubscription(
    @CurrentUser() user: User,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionService.getSubscription(
      user.id,
    );
    return SubscriptionResponseDto.fromEntity(subscription);
  }

  @Get('usage')
  @ApiOperation({
    summary: 'Get usage summary',
    description:
      "Returns today's usage for all tracked actions and their limits based on the current plan.",
  })
  @ApiResponse({
    status: 200,
    description: 'Usage summary',
    type: UsageSummaryDto,
  })
  async getUsage(@CurrentUser() user: User): Promise<UsageSummaryDto> {
    const items = await this.subscriptionService.getUsageSummary(user.id);
    return UsageSummaryDto.from(items);
  }
}
