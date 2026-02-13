import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, Paginated, PaginationType } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import {
  AiService,
  Recipe as AiRecipe,
} from '../ai/ai.service';
import { CategoriesService } from '../categories/categories.service';
import { Category } from '../entities/category.entity';
import { Recipe } from '../entities/recipe.entity';
import { RecipeIngredient } from '../entities/recipe-ingredient.entity';
import { ParseRecipeDto } from './dto/parse-recipe.dto';
import { ParseRecipeResponseDto } from './dto/ingredient.dto';
import {
  GenerateMealPlanDto,
  GenerateSingleRecipeDto,
  MealPlanResponseDto,
  RecipeDto,
  SingleRecipeResponseDto,
} from './dto/meal-plan.dto';
import {
  SuggestRecipeDto,
  SuggestRecipeResponseDto,
} from './dto/suggest-recipe.dto';
import { SaveRecipeDto, UpdateRecipeDto } from './dto/save-recipe.dto';
import { RecipeResponseDto } from './dto/recipe-response.dto';

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);

  // Business constraints
  private readonly MAX_PEOPLE = 20;
  private readonly MAX_DAYS = 7;
  private readonly MIN_PEOPLE = 1;
  private readonly MIN_DAYS = 1;

  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepo: Repository<Recipe>,
    @InjectRepository(RecipeIngredient)
    private readonly ingredientRepo: Repository<RecipeIngredient>,
    private aiService: AiService,
    private categoriesService: CategoriesService,
  ) {}

  // ==================== SAVED RECIPES CRUD ====================

  async saveRecipe(
    userId: string,
    dto: SaveRecipeDto,
  ): Promise<RecipeResponseDto> {
    const title =
      dto.title || `Recipe ${new Date().toISOString().split('T')[0]}`;

    const recipe = this.recipeRepo.create({
      title,
      source: dto.source,
      text: dto.text,
      userId,
      ingredients: dto.ingredients.map((ing, index) =>
        this.ingredientRepo.create({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          categoryId: ing.categoryId ?? null,
          position: index,
        }),
      ),
    });

    const saved = await this.recipeRepo.save(recipe);

    this.logger.log(
      {
        id: saved.id,
        title: saved.title,
        source: saved.source,
        ingredientsCount: saved.ingredients.length,
      },
      'Recipe saved',
    );

    return RecipeResponseDto.fromEntity(saved);
  }

  async findAllByUser(
    userId: string,
    query: PaginateQuery,
  ): Promise<Paginated<Recipe>> {
    return paginate(query, this.recipeRepo, {
      sortableColumns: ['createdAt', 'id'],
      defaultSortBy: [['createdAt', 'DESC']],
      paginationType: PaginationType.CURSOR,
      where: { userId },
    });
  }

  async findOne(userId: string, id: string): Promise<RecipeResponseDto> {
    const recipe = await this.recipeRepo.findOne({
      where: { id },
      relations: ['mealPlanRecipes', 'mealPlanRecipes.mealPlan'],
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found`);
    }

    if (recipe.userId !== userId) {
      throw new ForbiddenException();
    }

    return RecipeResponseDto.fromEntity(recipe);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateRecipeDto,
  ): Promise<RecipeResponseDto> {
    const recipe = await this.recipeRepo.findOne({ where: { id } });

    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found`);
    }

    if (recipe.userId !== userId) {
      throw new ForbiddenException();
    }

    if (dto.title !== undefined) recipe.title = dto.title;
    if (dto.text !== undefined) recipe.text = dto.text;

    if (dto.ingredients !== undefined) {
      await this.ingredientRepo.delete({ recipeId: id });

      recipe.ingredients = dto.ingredients.map((ing, index) =>
        this.ingredientRepo.create({
          recipeId: id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          categoryId: ing.categoryId ?? null,
          position: index,
        }),
      );
    }

    const saved = await this.recipeRepo.save(recipe);

    this.logger.log({ id: saved.id, title: saved.title }, 'Recipe updated');

    return RecipeResponseDto.fromEntity(saved);
  }

  async delete(userId: string, id: string): Promise<void> {
    const recipe = await this.recipeRepo.findOne({ where: { id } });

    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found`);
    }

    if (recipe.userId !== userId) {
      throw new ForbiddenException();
    }

    await this.recipeRepo.remove(recipe);

    this.logger.log({ id }, 'Recipe deleted');
  }

  // ==================== AI RECIPE OPERATIONS ====================

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

  async generateSingleRecipe(
    dto: GenerateSingleRecipeDto,
    userId: string,
  ): Promise<SingleRecipeResponseDto> {
    this.logger.debug(
      { query: dto.query, language: dto.language },
      'Generating single recipe from user query',
    );

    const categories = await this.categoriesService.findAll(userId);
    const categoryMap = new Map(categories.map((cat) => [cat.slug, cat]));
    const categoryHints = categories.map((cat) => ({
      slug: cat.slug,
      name: cat.name,
    }));

    const aiResponse = await this.aiService.generateSingleRecipe(
      dto.query,
      dto.language || 'uk',
      categoryHints,
    );

    const { numberOfPeople } = aiResponse;
    if (numberOfPeople < this.MIN_PEOPLE || numberOfPeople > this.MAX_PEOPLE) {
      this.logger.warn(
        { numberOfPeople, min: this.MIN_PEOPLE, max: this.MAX_PEOPLE },
        'Business constraint violation: numberOfPeople out of range',
      );
      throw new BadRequestException(
        `Number of people must be between ${this.MIN_PEOPLE} and ${this.MAX_PEOPLE}. ` +
          `Received: ${numberOfPeople}.`,
      );
    }

    this.logger.log(
      {
        numberOfPeople,
        dishName: aiResponse.recipe.dishName,
      },
      'Single recipe generated successfully',
    );

    return {
      numberOfPeople,
      recipe: this.mapRecipeCategories(aiResponse.recipe, categoryMap),
    };
  }

  async generateMealPlan(
    generateMealPlanDto: GenerateMealPlanDto,
    userId: string,
  ): Promise<MealPlanResponseDto> {
    this.logger.debug(
      {
        query: generateMealPlanDto.query,
        language: generateMealPlanDto.language,
      },
      'Generating meal plan from user query',
    );

    const categories = await this.categoriesService.findAll(userId);
    const categoryMap = new Map(categories.map((cat) => [cat.slug, cat]));
    const categoryHints = categories.map((cat) => ({
      slug: cat.slug,
      name: cat.name,
    }));

    const aiResponse = await this.aiService.generateMealPlanFromUserQuery(
      generateMealPlanDto.query,
      generateMealPlanDto.language || 'uk',
      categoryHints,
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
      description: aiResponse.description,
      recipes: aiResponse.recipes.map((r) =>
        this.mapRecipeCategories(r, categoryMap),
      ),
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

  private mapRecipeCategories(
    recipe: AiRecipe,
    categoryMap: Map<string, Category>,
  ): RecipeDto {
    return {
      dishName: recipe.dishName,
      description: recipe.description,
      ingredients: recipe.ingredients.map((ing) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        categoryId: ing.categorySlug
          ? (categoryMap.get(ing.categorySlug)?.id ?? null)
          : null,
      })),
      instructions: recipe.instructions,
      cookingTime: recipe.cookingTime,
    };
  }
}
