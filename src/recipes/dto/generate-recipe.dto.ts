import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateRecipeDto {
  @ApiProperty({
    description: 'Dish name that user wants to cook',
    example: 'borscht',
  })
  @IsString()
  @IsNotEmpty()
  dishName: string;

  @ApiProperty({
    description: 'Number of people (optional, default 1)',
    example: 1,
    minimum: 1,
    maximum: 20,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1, { message: 'Number of people must be at least 1' })
  @Max(20, {
    message: 'Number of people cannot exceed 20 (unrealistic use case)',
  })
  numberOfPeople?: number;
}

export class GenerateRecipeResponseDto {
  @ApiProperty({
    description: 'Dish name',
    example: 'Classic Ukrainian Borscht',
  })
  dishName: string;

  @ApiProperty({
    description: 'Recipe description',
    example: 'Traditional Ukrainian borscht with beetroot and meat',
  })
  description: string;

  @ApiProperty({
    description: 'List of ingredients',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'beetroot' },
        quantity: { type: 'string', example: '2' },
        unit: { type: 'string', example: 'pieces' },
      },
    },
  })
  ingredients: Array<{
    name: string;
    quantity: string;
    unit: string;
  }>;

  @ApiProperty({
    description: 'Cooking time (minutes)',
    example: 90,
  })
  cookingTime: number;

  @ApiProperty({
    description: 'Number of people',
    example: 1,
  })
  numberOfPeople: number;
}
