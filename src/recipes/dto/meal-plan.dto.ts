import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  MinLength,
  MaxLength,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsNotPromptInjection } from '../../common/validators';

// ============= REQUEST DTO =============

export class GenerateMealPlanDto {
  @ApiProperty({
    description: 'User query in any language',
    example: 'borscht for 4 people',
    examples: [
      'borscht for 4 people',
      'plan for 3 days for 2 people',
      'dinner for a week',
      'lunch for the week, vegetarian',
    ],
    minLength: 3,
    maxLength: 500,
  })
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @IsNotEmpty({ message: 'Query cannot be empty' })
  @MinLength(3, { message: 'Query is too short (min 3 characters)' })
  @MaxLength(500, { message: 'Query is too long (max 500 characters)' })
  @Matches(/^[^<>{}[\]\\$#@`|~^&;]+$/, {
    message:
      'Query contains forbidden characters (no <, >, {, }, [, ], \\, $, #, @, `, |, ~, ^, &, ;)',
  })
  @IsNotPromptInjection({ message: 'Query contains suspicious patterns' })
  query: string;

  @ApiProperty({
    description: 'Response language (ISO 639-1 code)',
    example: 'uk',
    enum: ['uk', 'en', 'pl', 'de', 'es', 'fr'],
    default: 'uk',
    required: false,
  })
  @Transform(({ value }: { value: string }) => value?.toLowerCase()?.trim())
  @IsString()
  @IsOptional()
  @IsIn(['uk', 'en', 'pl', 'de', 'es', 'fr'], {
    message: 'Language must be one of: uk, en, pl, de, es, fr',
  })
  @Length(2, 2, { message: 'Language code must be exactly 2 characters' })
  language?: string = 'uk';
}

// ============= RESPONSE DTOs =============

export class UnitDto {
  @ApiProperty({
    description: 'Canonical unit name (in English)',
    example: 'grams',
  })
  canonical: string;

  @ApiProperty({
    description: 'Localized unit name',
    example: 'grams',
  })
  localized: string;
}

export class RecipeIngredientDto {
  @ApiProperty({
    description: 'Ingredient name',
    example: 'beetroot',
  })
  name: string;

  @ApiProperty({
    description: 'Quantity (number)',
    example: 2,
  })
  quantity: number;

  @ApiProperty({
    description: 'Unit of measurement',
    type: UnitDto,
  })
  unit: UnitDto;
}

export class InstructionStepDto {
  @ApiProperty({
    description: 'Step number',
    example: 1,
  })
  step: number;

  @ApiProperty({
    description: 'Step instruction text',
    example: 'Peel and dice the beetroot into small cubes',
  })
  text: string;
}

export class RecipeDto {
  @ApiProperty({
    description: 'Dish name',
    example: 'Classic Ukrainian Borscht',
  })
  dishName: string;

  @ApiProperty({
    description: 'Short description of the dish',
    example: 'Traditional Ukrainian borscht with beetroot, cabbage and meat',
  })
  description: string;

  @ApiProperty({
    description: 'List of ingredients for the recipe',
    type: [RecipeIngredientDto],
  })
  ingredients: RecipeIngredientDto[];

  @ApiProperty({
    description: 'Step-by-step cooking instructions',
    type: [InstructionStepDto],
  })
  instructions: InstructionStepDto[];

  @ApiProperty({
    description: 'Cooking time in minutes',
    example: 90,
  })
  cookingTime: number;
}

export class ParsedRequestDto {
  @ApiProperty({
    description: 'Number of people',
    example: 4,
  })
  numberOfPeople: number;

  @ApiProperty({
    description: 'Number of days',
    example: 1,
  })
  numberOfDays: number;

  @ApiProperty({
    description: 'Dietary restrictions',
    example: ['vegetarian'],
    type: [String],
  })
  dietaryRestrictions: string[];

  @ApiProperty({
    description: 'Meal type (breakfast, lunch, dinner, etc.)',
    example: 'dinner',
    nullable: true,
  })
  mealType: string | null;
}

export class MealPlanResponseDto {
  @ApiProperty({
    description: 'Parsed user request',
    type: ParsedRequestDto,
  })
  parsedRequest: ParsedRequestDto;

  @ApiProperty({
    description: 'List of generated recipes',
    type: [RecipeDto],
  })
  recipes: RecipeDto[];
}
