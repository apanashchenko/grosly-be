import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MealPlan } from '../../entities/meal-plan.entity';
import { RecipeSource } from '../../recipes/enums/recipe-source.enum';

class MealPlanRecipeResponseDto {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  id: string;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  recipeId: string;

  @ApiProperty({ example: 'Classic Ukrainian Borscht' })
  recipeTitle: string;

  @ApiProperty({ enum: RecipeSource, example: RecipeSource.GENERATED })
  recipeSource: RecipeSource;

  @ApiProperty({
    description: 'Full recipe text content',
    example: 'Borscht\n\nIngredients:\n- beetroot 2 pcs...',
  })
  recipeText: string;

  @ApiPropertyOptional({
    description: 'Shopping list linked to this recipe',
    nullable: true,
  })
  recipeShoppingListId: string | null;

  @ApiProperty({ example: 1 })
  dayNumber: number;

  @ApiProperty({ example: 0 })
  position: number;
}

export class MealPlanResponseDto {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  id: string;

  @ApiProperty({ example: 'Weekly dinner plan' })
  name: string;

  @ApiProperty({ example: 3 })
  numberOfDays: number;

  @ApiProperty({ example: 2 })
  numberOfPeople: number;

  @ApiPropertyOptional({ nullable: true })
  shoppingListId: string | null;

  @ApiProperty({ type: [MealPlanRecipeResponseDto] })
  recipes: MealPlanRecipeResponseDto[];

  @ApiProperty({ example: '2026-02-12T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-02-12T12:00:00.000Z' })
  updatedAt: string;

  static fromEntity(entity: MealPlan): MealPlanResponseDto {
    const dto = new MealPlanResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.numberOfDays = entity.numberOfDays;
    dto.numberOfPeople = entity.numberOfPeople;
    dto.shoppingListId = entity.shoppingListId ?? null;
    dto.recipes = (entity.mealPlanRecipes || [])
      .sort((a, b) => {
        if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
        return a.position - b.position;
      })
      .map((mpr) => ({
        id: mpr.id,
        recipeId: mpr.recipeId,
        recipeTitle: mpr.recipe?.title ?? '',
        recipeSource: mpr.recipe?.source ?? RecipeSource.GENERATED,
        recipeText: mpr.recipe?.text ?? '',
        recipeShoppingListId: mpr.recipe?.shoppingListId ?? null,
        dayNumber: mpr.dayNumber,
        position: mpr.position,
      }));
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }
}

export class MealPlanListItemDto {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  id: string;

  @ApiProperty({ example: 'Weekly dinner plan' })
  name: string;

  @ApiProperty({ example: 3 })
  numberOfDays: number;

  @ApiProperty({ example: 2 })
  numberOfPeople: number;

  @ApiProperty({ description: 'Number of recipes in the plan', example: 5 })
  recipesCount: number;

  @ApiProperty({ example: '2026-02-12T12:00:00.000Z' })
  createdAt: string;

  static fromEntity(entity: MealPlan): MealPlanListItemDto {
    const dto = new MealPlanListItemDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.numberOfDays = entity.numberOfDays;
    dto.numberOfPeople = entity.numberOfPeople;
    dto.recipesCount = entity.mealPlanRecipes?.length ?? 0;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}
