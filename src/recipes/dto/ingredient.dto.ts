import { ApiProperty } from '@nestjs/swagger';
import { RecipeSource } from '../enums/recipe-source.enum';

export class IngredientDto {
  @ApiProperty({
    description: 'Product name',
    example: 'beetroot',
  })
  name: string;

  @ApiProperty({
    description: 'Product quantity (null for "to taste" items)',
    example: 2,
    nullable: true,
  })
  quantity: number | null;

  @ApiProperty({
    description:
      'Canonical unit in English for DB storage (e.g. "g", "ml", "pcs", "tbsp")',
    example: 'pcs',
  })
  unit: string;

  @ApiProperty({
    description: 'Localized unit for display (e.g. "грам", "штук", "мл")',
    example: 'штук',
  })
  localizedUnit: string;

  @ApiProperty({
    description: 'Additional note (e.g. "to taste")',
    example: null,
    nullable: true,
  })
  note: string | null;

  @ApiProperty({
    description:
      'Matched category ID for use when creating shopping list items (null if no match)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    nullable: true,
  })
  categoryId: string | null;
}

export class ParseRecipeResponseDto {
  @ApiProperty({
    description:
      'Source of the parsed recipe (PARSED for text, PARSED_IMAGE for image)',
    enum: RecipeSource,
    example: RecipeSource.PARSED,
  })
  source: RecipeSource;

  @ApiProperty({
    description:
      'Clean, formatted recipe text including dish name, ingredients and instructions',
    example:
      'Борщ\n\nІнгредієнти:\n- Буряк — 2 шт\n- Картопля — 3 шт\n...\n\nПриготування:\n1. Очистити овочі...',
  })
  recipeText: string;

  @ApiProperty({
    description: 'List of ingredients from recipe',
    type: [IngredientDto],
  })
  ingredients: IngredientDto[];
}
