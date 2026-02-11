import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Request DTO for suggesting recipes from available ingredients
 */
export class SuggestRecipeDto {
  @ApiProperty({
    description: 'List of available ingredients (user input)',
    example: ['potato', 'carrot', 'onion', 'eggs'],
    type: [String],
    minItems: 1,
    maxItems: 20,
  })
  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1, { message: 'At least 1 ingredient is required' })
  @ArrayMaxSize(20, { message: 'Maximum 20 ingredients allowed' })
  @IsString({ each: true })
  ingredients: string[];

  @ApiProperty({
    description: 'Response language code (default: uk)',
    example: 'uk',
    required: false,
    default: 'uk',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({
    description:
      'Strict mode: use ONLY provided ingredients. Basic staples (salt, pepper, water, oil, butter) are still allowed. If no realistic recipe can be made, returns empty array.',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  strictMode?: boolean;
}

/**
 * Single suggested recipe
 */
export class SuggestedRecipe {
  @ApiProperty({
    description: 'Dish name',
    example: 'Potato pancakes',
  })
  dishName: string;

  @ApiProperty({
    description: 'Recipe description',
    example: 'Traditional Ukrainian potato pancakes',
  })
  description: string;

  @ApiProperty({
    description: 'List of ingredients with quantities',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'potato' },
        quantity: { type: 'number', example: 500 },
        unit: {
          type: 'object',
          properties: {
            canonical: { type: 'string', example: 'g' },
            localized: { type: 'string', example: 'grams' },
          },
        },
      },
    },
  })
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: {
      canonical: string;
      localized: string;
    };
  }>;

  @ApiProperty({
    description: 'Step-by-step cooking instructions, ordered starting from 1',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        step: { type: 'number', example: 1 },
        text: { type: 'string', example: 'Peel and grate potatoes' },
      },
    },
    example: [
      { step: 1, text: 'Peel and grate potatoes' },
      { step: 2, text: 'Mix with eggs and flour' },
      { step: 3, text: 'Fry in oil until golden' },
    ],
  })
  instructions: Array<{ step: number; text: string }>;

  @ApiProperty({
    description: 'Cooking time in minutes',
    example: 30,
  })
  cookingTime: number;

  @ApiProperty({
    description: 'Which user ingredients are used in this recipe',
    example: ['potato', 'onion', 'eggs'],
    type: [String],
  })
  matchedIngredients: string[];

  @ApiProperty({
    description: 'Additional ingredients needed beyond user input',
    example: ['flour', 'salt', 'oil'],
    type: [String],
  })
  additionalIngredients: string[];
}

/**
 * Response DTO for recipe suggestions
 */
export class SuggestRecipeResponseDto {
  @ApiProperty({
    description: 'List of 3-5 suggested recipes',
    type: [SuggestedRecipe],
  })
  suggestedRecipes: SuggestedRecipe[];
}
