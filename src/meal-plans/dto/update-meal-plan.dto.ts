import {
  IsString,
  IsOptional,
  IsInt,
  IsUUID,
  IsArray,
  ArrayMaxSize,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMealPlanDto {
  @ApiPropertyOptional({
    description: 'New meal plan name',
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
    description: 'Meal plan description',
    example: 'Healthy meals for the week with minimal prep time',
    maxLength: 1000,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Number of days' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  numberOfDays?: number;

  @ApiPropertyOptional({ description: 'Number of people' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  numberOfPeople?: number;

  @ApiPropertyOptional({
    description: 'Recipe UUIDs (full replace)',
    example: ['f47ac10b-58cc-4372-a567-0e02b2c3d479'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(21)
  @IsUUID('4', { each: true })
  recipes?: string[];
}
