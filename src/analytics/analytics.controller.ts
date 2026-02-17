import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AnalyticsOverviewResponseDto } from './dto/analytics-response.dto';
import { CurrentUser } from '../auth/decorators';
import { CurrentSpace } from '../spaces/decorators';
import { User } from '../entities/user.entity';

@ApiTags('analytics')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Space-Id',
  required: false,
  description:
    'Space UUID. If provided, analytics are scoped to that space. If omitted, analytics are for personal lists only.',
})
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get analytics overview',
    description:
      'Returns aggregated analytics: top products by frequency, item distribution by categories, and shopping list creation activity grouped by week or month.',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics overview data',
    type: AnalyticsOverviewResponseDto,
  })
  async getOverview(
    @CurrentUser() user: User,
    @CurrentSpace() spaceId: string | null,
    @Query(new ValidationPipe({ transform: true })) query: AnalyticsQueryDto,
  ): Promise<AnalyticsOverviewResponseDto> {
    return this.analyticsService.getOverview(
      user.id,
      spaceId,
      query.topProductsLimit ?? 10,
      query.period ?? 'week',
    );
  }
}
