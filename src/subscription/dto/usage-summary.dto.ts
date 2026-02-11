import { ApiProperty } from '@nestjs/swagger';
import { UsageAction } from '../enums/usage-action.enum';

class UsageItemDto {
  @ApiProperty({ enum: UsageAction })
  action: UsageAction;

  @ApiProperty({ description: 'Current usage count for today' })
  current: number;

  @ApiProperty({ description: 'Daily limit (0 = unlimited)' })
  limit: number;
}

export class UsageSummaryDto {
  @ApiProperty({ type: [UsageItemDto] })
  usage: UsageItemDto[];

  static from(
    items: { action: UsageAction; current: number; limit: number }[],
  ): UsageSummaryDto {
    const dto = new UsageSummaryDto();
    dto.usage = items;
    return dto;
  }
}
