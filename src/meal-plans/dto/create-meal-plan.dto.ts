import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMealPlanDto {
  @ApiPropertyOptional({
    description: 'Meal plan name (auto-generated if not provided)',
    example: 'Weekly dinner plan',
    minLength: 1,
    maxLength: 200,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Matches(/^[^<>{}[\]\\$#@`|~^&;]+$/, {
    message: 'Name contains forbidden characters',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Number of days in the meal plan',
    example: 3,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  numberOfDays?: number;

  @ApiPropertyOptional({
    description: 'Number of people the plan is for',
    example: 2,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  numberOfPeople?: number;
}
