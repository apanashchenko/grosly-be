import { IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export type ActivityPeriod = 'week' | 'month';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of top products to return',
    example: 10,
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  topProductsLimit?: number = 10;

  @ApiPropertyOptional({
    description:
      'Activity grouping period: week returns daily data for current week (Mon-Sun), month returns daily data for current month',
    enum: ['week', 'month'],
    default: 'week',
    example: 'week',
  })
  @IsOptional()
  @IsIn(['week', 'month'])
  period?: ActivityPeriod = 'week';
}
