import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TopProductItemDto {
  @ApiProperty({ description: 'Product name', example: 'milk' })
  name: string;

  @ApiProperty({
    description: 'Number of times added to shopping lists',
    example: 42,
  })
  count: number;
}

export class CategoryDistributionItemDto {
  @ApiProperty({
    description: 'Category ID (null for uncategorized)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    nullable: true,
  })
  categoryId: string | null;

  @ApiProperty({
    description: 'Category name',
    example: 'Dairy',
  })
  categoryName: string;

  @ApiPropertyOptional({
    description: 'Category slug',
    example: 'dairy',
    nullable: true,
  })
  slug: string | null;

  @ApiPropertyOptional({
    description: 'Category icon',
    example: '🥛',
    nullable: true,
  })
  icon: string | null;

  @ApiProperty({ description: 'Number of items in this category', example: 15 })
  count: number;
}

export class ActivityItemDto {
  @ApiProperty({
    description: 'Date label in YYYY-MM-DD format',
    example: '2026-02-17',
  })
  date: string;

  @ApiProperty({
    description: 'Number of shopping lists created',
    example: 5,
  })
  count: number;
}

export class AnalyticsOverviewResponseDto {
  @ApiProperty({
    description: 'Most frequently added products within the selected period',
    type: [TopProductItemDto],
  })
  topProducts: TopProductItemDto[];

  @ApiProperty({
    description: 'Item counts per category within the selected period',
    type: [CategoryDistributionItemDto],
  })
  categoriesDistribution: CategoryDistributionItemDto[];

  @ApiProperty({
    description: 'Shopping lists created per day within the selected period',
    type: [ActivityItemDto],
  })
  activity: ActivityItemDto[];
}
