import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { CategoriesService } from '../categories/categories.service';
import { Category } from '../entities/category.entity';
import { ParseRecipeDto } from './dto/parse-recipe.dto';
import { ParseRecipeResponseDto } from './dto/ingredient.dto';
import { GenerateMealPlanDto, MealPlanResponseDto } from './dto/meal-plan.dto';
import {
  SuggestRecipeDto,
  SuggestRecipeResponseDto,
} from './dto/suggest-recipe.dto';

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);

  // Business constraints
  private readonly MAX_PEOPLE = 20;
  private readonly MAX_DAYS = 7;
  private readonly MIN_PEOPLE = 1;
  private readonly MIN_DAYS = 1;

  constructor(
    private aiService: AiService,
    private categoriesService: CategoriesService,
  ) {}

  async parseRecipe(
    parseRecipeDto: ParseRecipeDto,
    userId: string,
  ): Promise<ParseRecipeResponseDto> {
    this.logger.debug(
      { recipeTextLength: parseRecipeDto.recipeText.length },
      'Parsing recipe text',
    );

    const categories = await this.categoriesService.findAll(userId);

    const categoryMap = new Map<string, Category>(
      categories.map((cat) => [cat.slug, cat]),
    );

    const categoryHints = categories.map((cat) => ({
      slug: cat.slug,
      name: cat.name,
    }));

    const ingredients = await this.aiService.extractIngredientsFromRecipe(
      parseRecipeDto.recipeText,
      'uk',
      categoryHints,
    );

    this.logger.log(
      { ingredientsCount: ingredients.length },
      'Recipe parsed successfully',
    );

    return {
      ingredients: ingredients.map((ing) => {
        const cat = ing.categorySlug
          ? (categoryMap.get(ing.categorySlug) ?? null)
          : null;
        return {
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit?.canonical ?? '',
          localizedUnit: ing.unit?.localized ?? '',
          note: ing.note,
          categoryId: cat?.id ?? null,
        };
      }),
    };
  }

  async generateMealPlan(
    generateMealPlanDto: GenerateMealPlanDto,
  ): Promise<MealPlanResponseDto> {
    this.logger.debug(
      {
        query: generateMealPlanDto.query,
        language: generateMealPlanDto.language,
      },
      'Generating meal plan from user query',
    );

    const aiResponse = await this.aiService.generateMealPlanFromUserQuery(
      generateMealPlanDto.query,
      generateMealPlanDto.language || 'uk',
    );

    // Business-level validation of AI-parsed values
    this.validateBusinessConstraints(aiResponse.parsedRequest);

    this.logger.log(
      {
        numberOfPeople: aiResponse.parsedRequest.numberOfPeople,
        numberOfDays: aiResponse.parsedRequest.numberOfDays,
        recipesCount: aiResponse.recipes.length,
      },
      'Meal plan generated successfully',
    );

    return {
      parsedRequest: aiResponse.parsedRequest,
      recipes: aiResponse.recipes,
    };
  }

  /**
   * Validates business constraints on parsed request values
   * Protects against unrealistic use cases and expensive AI calls
   */
  private validateBusinessConstraints(parsedRequest: {
    numberOfPeople: number;
    numberOfDays: number;
  }): void {
    const { numberOfPeople, numberOfDays } = parsedRequest;

    if (numberOfPeople < this.MIN_PEOPLE || numberOfPeople > this.MAX_PEOPLE) {
      this.logger.warn(
        {
          numberOfPeople,
          min: this.MIN_PEOPLE,
          max: this.MAX_PEOPLE,
          violationType: 'numberOfPeople',
        },
        'Business constraint violation: numberOfPeople out of range',
      );

      throw new BadRequestException(
        `Number of people must be between ${this.MIN_PEOPLE} and ${this.MAX_PEOPLE}. ` +
          `Received: ${numberOfPeople}. This is an unrealistic use case.`,
      );
    }

    if (numberOfDays < this.MIN_DAYS || numberOfDays > this.MAX_DAYS) {
      this.logger.warn(
        {
          numberOfDays,
          min: this.MIN_DAYS,
          max: this.MAX_DAYS,
          violationType: 'numberOfDays',
        },
        'Business constraint violation: numberOfDays out of range',
      );

      throw new BadRequestException(
        `Number of days must be between ${this.MIN_DAYS} and ${this.MAX_DAYS}. ` +
          `Received: ${numberOfDays}. For longer periods, please make multiple requests.`,
      );
    }
  }

  async suggestRecipe(
    suggestRecipeDto: SuggestRecipeDto,
  ): Promise<SuggestRecipeResponseDto> {
    this.logger.debug(
      {
        ingredientsCount: suggestRecipeDto.ingredients.length,
        language: suggestRecipeDto.language,
      },
      'Suggesting recipes from available ingredients',
    );

    const result = await this.aiService.suggestRecipesFromIngredients(
      suggestRecipeDto.ingredients,
      suggestRecipeDto.language || 'uk',
      suggestRecipeDto.strictMode ?? false,
    );

    // Business validation: ensure we got 0-3 recipes (0 is valid when no recipe is possible)
    if (result.suggestedRecipes.length > 3) {
      this.logger.warn(
        {
          recipesCount: result.suggestedRecipes.length,
          violationType: 'recipesCount',
        },
        'AI returned incorrect number of recipes',
      );

      throw new BadRequestException(
        `Expected 3-5 recipes, but received ${result.suggestedRecipes.length}`,
      );
    }

    this.logger.log(
      {
        recipesCount: result.suggestedRecipes.length,
      },
      'Recipes suggested successfully',
    );

    return result;
  }
}
