import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  paginate,
  Paginated,
  PaginationType,
  FilterOperator,
} from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { AiService, Recipe as AiRecipe } from '../ai/ai.service';
import { AiRequestLogService } from '../ai/ai-request-log.service';
import { UsageAction } from '../subscription/enums/usage-action.enum';
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
import {
  RecipeIngredientItemDto,
  SaveRecipeDto,
  UpdateRecipeDto,
  UpdateRecipeIngredientDto,
} from './dto/save-recipe.dto';
import { RecipeResponseDto } from './dto/recipe-response.dto';
import { RecipeSource } from './enums/recipe-source.enum';

@Injectable()
export class RecipesService {
  // Business constraints
  private readonly MAX_PEOPLE = 20;
  private readonly MAX_DAYS = 7;
  private readonly MIN_PEOPLE = 1;
  private readonly MIN_DAYS = 1;

  constructor(
    @InjectPinoLogger(RecipesService.name)
    private readonly logger: PinoLogger,
    @InjectRepository(Recipe)
    private readonly recipeRepo: Repository<Recipe>,
    @InjectRepository(RecipeIngredient)
    private readonly ingredientRepo: Repository<RecipeIngredient>,
    private aiService: AiService,
    private aiRequestLogService: AiRequestLogService,
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
      originalInput: dto.originalInput ?? null,
      userId,
      ingredients: dto.ingredients.map((ing, index) =>
        this.ingredientRepo.create({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          note: ing.note ?? null,
          categoryId: ing.categoryId ?? null,
          position: index,
        }),
      ),
    });

    const saved = await this.recipeRepo.save(recipe);

    this.logger.info(
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
      searchableColumns: ['title'],
      filterableColumns: {
        source: [FilterOperator.EQ],
      },
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
          note: ing.note ?? null,
          categoryId: ing.categoryId ?? null,
          position: index,
        }),
      );
    }

    const saved = await this.recipeRepo.save(recipe);

    this.logger.info({ id: saved.id, title: saved.title }, 'Recipe updated');

    return RecipeResponseDto.fromEntity(saved);
  }

  async duplicateMany(
    userId: string,
    ids: string[],
  ): Promise<RecipeResponseDto[]> {
    const recipes = await this.recipeRepo.find({
      where: ids.map((id) => ({ id })),
    });

    const foundIds = new Set(recipes.map((r) => r.id));
    const missing = ids.filter((id) => !foundIds.has(id));
    if (missing.length) {
      throw new NotFoundException(`Recipes not found: ${missing.join(', ')}`);
    }

    const notOwned = recipes.filter((r) => r.userId !== userId);
    if (notOwned.length) {
      throw new ForbiddenException();
    }

    const copies = recipes.map((recipe) =>
      this.recipeRepo.create({
        title: `${recipe.title} (copy)`,
        source: recipe.source,
        text: recipe.text,
        originalInput: recipe.originalInput,
        userId,
        ingredients: recipe.ingredients.map((ing, index) =>
          this.ingredientRepo.create({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            note: ing.note,
            categoryId: ing.categoryId,
            position: index,
          }),
        ),
      }),
    );

    const saved = await this.recipeRepo.save(copies);

    this.logger.info(
      { originalIds: ids, newIds: saved.map((c) => c.id) },
      'Recipes duplicated',
    );

    return saved.map((c) => RecipeResponseDto.fromEntity(c));
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

    this.logger.info({ id }, 'Recipe deleted');
  }

  async updateIngredient(
    userId: string,
    recipeId: string,
    ingredientId: string,
    dto: UpdateRecipeIngredientDto,
  ): Promise<RecipeResponseDto> {
    const recipe = await this.recipeRepo.findOne({ where: { id: recipeId } });

    if (!recipe) {
      throw new NotFoundException(`Recipe ${recipeId} not found`);
    }

    if (recipe.userId !== userId) {
      throw new ForbiddenException();
    }

    const ingredient = this.findIngredientInRecipe(recipe, ingredientId);

    if (dto.name !== undefined) ingredient.name = dto.name;
    if (dto.quantity !== undefined) ingredient.quantity = dto.quantity;
    if (dto.unit !== undefined) ingredient.unit = dto.unit;
    if (dto.note !== undefined) ingredient.note = dto.note;
    if (dto.categoryId !== undefined) ingredient.categoryId = dto.categoryId;
    if (dto.position !== undefined) ingredient.position = dto.position;

    await this.ingredientRepo.save(ingredient);

    this.logger.info({ recipeId, ingredientId }, 'Recipe ingredient updated');

    return this.findOne(userId, recipeId);
  }

  async addIngredient(
    userId: string,
    recipeId: string,
    dto: RecipeIngredientItemDto,
  ): Promise<RecipeResponseDto> {
    const recipe = await this.recipeRepo.findOne({ where: { id: recipeId } });

    if (!recipe) {
      throw new NotFoundException(`Recipe ${recipeId} not found`);
    }

    if (recipe.userId !== userId) {
      throw new ForbiddenException();
    }

    const maxPosition = recipe.ingredients.length
      ? Math.max(...recipe.ingredients.map((i) => i.position))
      : -1;

    const ingredient = this.ingredientRepo.create({
      recipeId,
      name: dto.name,
      quantity: dto.quantity,
      unit: dto.unit,
      note: dto.note ?? null,
      categoryId: dto.categoryId ?? null,
      position: maxPosition + 1,
    });

    await this.ingredientRepo.save(ingredient);

    this.logger.info(
      { recipeId, ingredientId: ingredient.id },
      'Recipe ingredient added',
    );

    return this.findOne(userId, recipeId);
  }

  async removeIngredient(
    userId: string,
    recipeId: string,
    ingredientId: string,
  ): Promise<void> {
    const recipe = await this.recipeRepo.findOne({ where: { id: recipeId } });

    if (!recipe) {
      throw new NotFoundException(`Recipe ${recipeId} not found`);
    }

    if (recipe.userId !== userId) {
      throw new ForbiddenException();
    }

    const ingredient = this.findIngredientInRecipe(recipe, ingredientId);

    await this.ingredientRepo.remove(ingredient);

    this.logger.info({ recipeId, ingredientId }, 'Recipe ingredient removed');
  }

  private findIngredientInRecipe(
    recipe: Recipe,
    ingredientId: string,
  ): RecipeIngredient {
    const ingredient = recipe.ingredients.find((i) => i.id === ingredientId);
    if (!ingredient) {
      throw new NotFoundException(
        `Ingredient ${ingredientId} not found in recipe ${recipe.id}`,
      );
    }
    return ingredient;
  }

  // ==================== AI RECIPE OPERATIONS ====================

  async parseRecipe(
    parseRecipeDto: ParseRecipeDto,
    userId: string,
  ): Promise<ParseRecipeResponseDto> {
    this.logger.info(
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

    const aiResult = await this.aiRequestLogService.logRequest({
      userId,
      action: UsageAction.RECIPE_PARSE,
      input: parseRecipeDto.recipeText,
      operation: () =>
        this.aiService.extractIngredientsFromRecipe(
          parseRecipeDto.recipeText,
          'uk',
          categoryHints,
        ),
    });

    if (aiResult.error) {
      throw new BadRequestException(aiResult.error);
    }

    this.logger.info(
      { ingredientsCount: aiResult.ingredients.length },
      'Recipe parsed successfully',
    );

    return {
      source: RecipeSource.PARSED,
      recipeText: aiResult.recipeText,
      ingredients: aiResult.ingredients.map((ing) => {
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

  async parseRecipeImage(
    file: { buffer: Buffer; mimetype: string; size: number },
    userId: string,
  ): Promise<ParseRecipeResponseDto> {
    this.logger.info(
      { imageSizeKb: Math.round(file.size / 1024), mimeType: file.mimetype },
      'Parsing recipe from image',
    );

    const categories = await this.categoriesService.findAll(userId);

    const categoryMap = new Map<string, Category>(
      categories.map((cat) => [cat.slug, cat]),
    );

    const categoryHints = categories.map((cat) => ({
      slug: cat.slug,
      name: cat.name,
    }));

    const aiResult = await this.aiRequestLogService.logRequest({
      userId,
      action: UsageAction.PARSE_IMAGE,
      input: `[image ${file.mimetype} ${Math.round(file.size / 1024)}KB]`,
      operation: () =>
        this.aiService.extractIngredientsFromImage(
          file.buffer,
          file.mimetype,
          'uk',
          categoryHints,
        ),
    });

    if (aiResult.error) {
      throw new BadRequestException(aiResult.error);
    }

    this.logger.info(
      { ingredientsCount: aiResult.ingredients.length },
      'Recipe parsed from image successfully',
    );

    return {
      source: RecipeSource.PARSED_IMAGE,
      recipeText: aiResult.recipeText,
      ingredients: aiResult.ingredients.map((ing) => {
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
    this.logger.info(
      { query: dto.query, language: dto.language },
      'Generating single recipe from user query',
    );

    const categories = await this.categoriesService.findAll(userId);
    const categoryMap = new Map(categories.map((cat) => [cat.slug, cat]));
    const categoryHints = categories.map((cat) => ({
      slug: cat.slug,
      name: cat.name,
    }));

    const aiResponse = await this.aiRequestLogService.logRequest({
      userId,
      action: UsageAction.RECIPE_GENERATION,
      input: dto.query,
      operation: () =>
        this.aiService.generateSingleRecipe(
          dto.query,
          dto.language || 'uk',
          categoryHints,
        ),
    });

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

    this.logger.info(
      {
        numberOfPeople,
        recipesCount: aiResponse.recipes.length,
      },
      'Single recipe generated successfully',
    );

    return {
      numberOfPeople,
      recipes: aiResponse.recipes.map((recipe) =>
        this.mapRecipeCategories(recipe, categoryMap),
      ),
    };
  }

  async generateMealPlan(
    generateMealPlanDto: GenerateMealPlanDto,
    userId: string,
  ): Promise<MealPlanResponseDto> {
    this.logger.info(
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

    const aiResponse = await this.aiRequestLogService.logRequest({
      userId,
      action: UsageAction.RECIPE_GENERATION,
      input: generateMealPlanDto.query,
      operation: () =>
        this.aiService.generateMealPlanFromUserQuery(
          generateMealPlanDto.query,
          generateMealPlanDto.language || 'uk',
          categoryHints,
        ),
    });

    // Business-level validation of AI-parsed values
    this.validateBusinessConstraints(aiResponse.parsedRequest);

    this.logger.info(
      {
        numberOfPeople: aiResponse.parsedRequest.numberOfPeople,
        numberOfDays: aiResponse.parsedRequest.numberOfDays,
        daysCount: aiResponse.days.length,
      },
      'Meal plan generated successfully',
    );

    return {
      parsedRequest: aiResponse.parsedRequest,
      description: aiResponse.description,
      days: aiResponse.days.map((day) => ({
        dayNumber: day.dayNumber,
        recipes: day.recipes.map((r) =>
          this.mapRecipeCategories(r, categoryMap),
        ),
      })),
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
    userId: string,
  ): Promise<SuggestRecipeResponseDto> {
    this.logger.info(
      {
        ingredientsCount: suggestRecipeDto.ingredients.length,
        language: suggestRecipeDto.language,
      },
      'Suggesting recipes from available ingredients',
    );

    const categories = await this.categoriesService.findAll(userId);
    const categoryMap = new Map(categories.map((cat) => [cat.slug, cat]));
    const categoryHints = categories.map((cat) => ({
      slug: cat.slug,
      name: cat.name,
    }));

    const result = await this.aiRequestLogService.logRequest({
      userId,
      action: UsageAction.RECIPE_SUGGEST,
      input: suggestRecipeDto.ingredients.join(', '),
      operation: () =>
        this.aiService.suggestRecipesFromIngredients(
          suggestRecipeDto.ingredients,
          suggestRecipeDto.language || 'uk',
          suggestRecipeDto.strictMode ?? false,
          categoryHints,
        ),
    });

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

    this.logger.info(
      {
        recipesCount: result.suggestedRecipes.length,
      },
      'Recipes suggested successfully',
    );

    return {
      suggestedRecipes: result.suggestedRecipes.map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          categoryId: ing.categorySlug
            ? (categoryMap.get(ing.categorySlug)?.id ?? null)
            : null,
        })),
      })),
    };
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

  // ==================== STREAMED AI OPERATIONS ====================

  async generateSingleRecipeStreamed(
    dto: GenerateSingleRecipeDto,
    userId: string,
    onChunk: (delta: string) => void,
  ): Promise<SingleRecipeResponseDto> {
    const categories = await this.categoriesService.findAll(userId);
    const categoryMap = new Map(categories.map((cat) => [cat.slug, cat]));
    const categoryHints = categories.map((cat) => ({
      slug: cat.slug,
      name: cat.name,
    }));

    const aiResponse = await this.aiRequestLogService.logRequest({
      userId,
      action: UsageAction.RECIPE_GENERATION,
      input: dto.query,
      operation: () =>
        this.aiService.generateSingleRecipeStreamed(
          dto.query,
          dto.language || 'uk',
          categoryHints,
          onChunk,
        ),
    });

    const { numberOfPeople } = aiResponse;
    if (numberOfPeople < this.MIN_PEOPLE || numberOfPeople > this.MAX_PEOPLE) {
      throw new BadRequestException(
        `Number of people must be between ${this.MIN_PEOPLE} and ${this.MAX_PEOPLE}. ` +
          `Received: ${numberOfPeople}.`,
      );
    }

    return {
      numberOfPeople,
      recipes: aiResponse.recipes.map((recipe) =>
        this.mapRecipeCategories(recipe, categoryMap),
      ),
    };
  }

  async generateMealPlanStreamed(
    dto: GenerateMealPlanDto,
    userId: string,
    onChunk: (delta: string) => void,
  ): Promise<MealPlanResponseDto> {
    const categories = await this.categoriesService.findAll(userId);
    const categoryMap = new Map(categories.map((cat) => [cat.slug, cat]));
    const categoryHints = categories.map((cat) => ({
      slug: cat.slug,
      name: cat.name,
    }));

    const aiResponse = await this.aiRequestLogService.logRequest({
      userId,
      action: UsageAction.RECIPE_GENERATION,
      input: dto.query,
      operation: () =>
        this.aiService.generateMealPlanStreamed(
          dto.query,
          dto.language || 'uk',
          categoryHints,
          onChunk,
        ),
    });

    this.validateBusinessConstraints(aiResponse.parsedRequest);

    return {
      parsedRequest: aiResponse.parsedRequest,
      description: aiResponse.description,
      days: aiResponse.days.map((day) => ({
        dayNumber: day.dayNumber,
        recipes: day.recipes.map((r) =>
          this.mapRecipeCategories(r, categoryMap),
        ),
      })),
    };
  }

  async suggestRecipeStreamed(
    dto: SuggestRecipeDto,
    userId: string,
    onChunk: (delta: string) => void,
  ): Promise<SuggestRecipeResponseDto> {
    const categories = await this.categoriesService.findAll(userId);
    const categoryMap = new Map(categories.map((cat) => [cat.slug, cat]));
    const categoryHints = categories.map((cat) => ({
      slug: cat.slug,
      name: cat.name,
    }));

    const result = await this.aiRequestLogService.logRequest({
      userId,
      action: UsageAction.RECIPE_SUGGEST,
      input: dto.ingredients.join(', '),
      operation: () =>
        this.aiService.suggestRecipesStreamed(
          dto.ingredients,
          dto.language || 'uk',
          dto.strictMode ?? false,
          categoryHints,
          onChunk,
        ),
    });

    return {
      suggestedRecipes: result.suggestedRecipes.map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          categoryId: ing.categorySlug
            ? (categoryMap.get(ing.categorySlug)?.id ?? null)
            : null,
        })),
      })),
    };
  }
}
