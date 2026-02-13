import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Recipe } from '../../entities/recipe.entity';
import { RecipeIngredient } from '../../entities/recipe-ingredient.entity';
import { RecipeSource } from '../enums/recipe-source.enum';

class IngredientCategoryDto {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  id: string;

  @ApiProperty({ example: 'Vegetables' })
  name: string;

  @ApiPropertyOptional({ example: '🥕', nullable: true })
  icon: string | null;
}

export class RecipeIngredientResponseDto {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  id: string;

  @ApiProperty({ example: 'beetroot' })
  name: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 'pcs' })
  unit: string;

  @ApiPropertyOptional({ type: IngredientCategoryDto, nullable: true })
  category: IngredientCategoryDto | null;

  @ApiProperty({ example: 0 })
  position: number;

  static fromEntity(entity: RecipeIngredient): RecipeIngredientResponseDto {
    const dto = new RecipeIngredientResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.quantity = Number(entity.quantity);
    dto.unit = entity.unit;
    dto.category = entity.category
      ? {
          id: entity.category.id,
          name: entity.category.name,
          icon: entity.category.icon ?? null,
        }
      : null;
    dto.position = entity.position;
    return dto;
  }
}

export class RecipeResponseDto {
  @ApiProperty({
    description: 'Unique identifier (UUID)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({
    description: 'Recipe title',
    example: 'Classic Ukrainian Borscht',
  })
  title: string;

  @ApiProperty({
    description: 'Recipe source type',
    enum: RecipeSource,
    example: RecipeSource.PARSED,
  })
  source: RecipeSource;

  @ApiProperty({
    description: 'Full recipe text content for display',
    example:
      'Borscht\n\nIngredients:\n- beetroot 2 pcs\n- potatoes 3 pcs\n\nInstructions:\n1. Peel and dice beetroot...',
  })
  text: string;

  @ApiProperty({
    description: 'Recipe ingredients',
    type: [RecipeIngredientResponseDto],
  })
  ingredients: RecipeIngredientResponseDto[];

  @ApiProperty({
    description: 'Creation date (ISO 8601)',
    example: '2026-02-11T12:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update date (ISO 8601)',
    example: '2026-02-11T12:00:00.000Z',
  })
  updatedAt: string;

  @ApiProperty({
    description: 'Meal plans that include this recipe',
    type: () => [RecipeMealPlanDto],
  })
  mealPlans: RecipeMealPlanDto[];

  static fromEntity(entity: Recipe): RecipeResponseDto {
    const dto = new RecipeResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.source = entity.source;
    dto.text = entity.text;
    dto.ingredients = (entity.ingredients ?? [])
      .sort((a, b) => a.position - b.position)
      .map((ing) => RecipeIngredientResponseDto.fromEntity(ing));
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    dto.mealPlans = (entity.mealPlanRecipes ?? []).map((mpr) => ({
      id: mpr.mealPlan.id,
      name: mpr.mealPlan.name,
    }));
    return dto;
  }
}

export class RecipeMealPlanDto {
  @ApiProperty({
    description: 'Meal plan ID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({
    description: 'Meal plan name',
    example: 'Weekly dinner plan',
  })
  name: string;
}

export class RecipeListItemDto {
  @ApiProperty({
    description: 'Unique identifier (UUID)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({
    description: 'Recipe title',
    example: 'Classic Ukrainian Borscht',
  })
  title: string;

  @ApiProperty({
    description: 'Recipe source type',
    enum: RecipeSource,
    example: RecipeSource.PARSED,
  })
  source: RecipeSource;

  @ApiProperty({
    description: 'Creation date (ISO 8601)',
    example: '2026-02-11T12:00:00.000Z',
  })
  createdAt: string;

  static fromEntity(entity: Recipe): RecipeListItemDto {
    const dto = new RecipeListItemDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.source = entity.source;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}
