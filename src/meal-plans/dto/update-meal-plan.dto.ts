import {
  IsString,
  IsOptional,
  IsInt,
  IsUUID,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMealPlanRecipeDto {
  @ApiProperty({
    description: 'Recipe UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID('4', { message: 'recipeId must be a valid UUID' })
  recipeId: string;

  @ApiPropertyOptional({
    description: 'Day number in the meal plan (defaults to 1)',
    example: 1,
    default: 1,
    minimum: 1,
    maximum: 7,
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Day number must be at least 1' })
  @Max(7, { message: 'Day number must be at most 7' })
  dayNumber?: number;
}

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
    description: 'Recipes with day assignments (full replace)',
    type: [UpdateMealPlanRecipeDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(21)
  @ValidateNested({ each: true })
  @Type(() => UpdateMealPlanRecipeDto)
  recipes?: UpdateMealPlanRecipeDto[];
}
