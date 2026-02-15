import {
  IsString,
  IsOptional,
  IsInt,
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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SaveRecipeDto } from '../../recipes/dto/save-recipe.dto';

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

  @ApiPropertyOptional({
    description: 'Original user input that was used to generate this meal plan',
    example: 'план на тиждень для 2 людей',
    maxLength: 5000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  originalInput?: string;

  @ApiPropertyOptional({
    description: 'Recipes to create and add to the meal plan',
    type: [SaveRecipeDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(21)
  @ValidateNested({ each: true })
  @Type(() => SaveRecipeDto)
  recipes?: SaveRecipeDto[];
}
