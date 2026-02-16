/// <reference types="multer" />
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Res,
  HttpCode,
  ParseUUIDPipe,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { Paginate, Paginated } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { RecipesService } from './recipes.service';
import { ParseRecipeDto } from './dto/parse-recipe.dto';
import { ParseRecipeResponseDto } from './dto/ingredient.dto';
import {
  GenerateMealPlanDto,
  GenerateSingleRecipeDto,
  MealPlanResponseDto,
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
import {
  RecipeResponseDto,
  RecipeListItemDto,
} from './dto/recipe-response.dto';
import { CurrentUser } from '../auth/decorators';
import { User } from '../entities/user.entity';
import { Recipe } from '../entities/recipe.entity';
import { RequireFeature } from '../subscription/decorators/require-feature.decorator';
import { RequireUsageLimit } from '../subscription/decorators/require-usage-limit.decorator';
import { UsageAction } from '../subscription/enums/usage-action.enum';

@ApiTags('recipes')
@ApiBearerAuth()
@Controller('recipes')
export class RecipesController {
  constructor(
    @InjectPinoLogger(RecipesController.name)
    private readonly logger: PinoLogger,
    private readonly recipesService: RecipesService,
  ) {}

  // ==================== SAVED RECIPES CRUD ====================

  @Post()
  @ApiOperation({
    summary: 'Save a recipe',
    description:
      'Saves an AI-generated/parsed/suggested recipe with its ingredients.',
  })
  @ApiResponse({
    status: 201,
    description: 'Recipe saved successfully',
    type: RecipeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async saveRecipe(
    @CurrentUser() user: User,
    @Body(new ValidationPipe()) dto: SaveRecipeDto,
  ): Promise<RecipeResponseDto> {
    return await this.recipesService.saveRecipe(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all saved recipes',
    description:
      "Returns user's saved recipes list (lightweight, without full data). Supports cursor-based pagination, search by title, and filtering by source.",
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search recipes by title (case-insensitive)',
    example: 'borscht',
  })
  @ApiQuery({
    name: 'filter.source',
    required: false,
    enum: [
      'PARSED',
      'PARSED_IMAGE',
      'GENERATED',
      'SUGGESTED',
      'MEAL_PLAN',
      'MANUAL',
    ],
    description: 'Filter by recipe source',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of saved recipes',
  })
  async findAll(
    @CurrentUser() user: User,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Recipe>> {
    const result = await this.recipesService.findAllByUser(user.id, query);
    return {
      ...result,
      data: result.data.map((r) =>
        RecipeListItemDto.fromEntity(r),
      ) as unknown as Recipe[],
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get saved recipe by ID',
    description:
      'Returns full recipe data including originalInput and AI response data',
  })
  @ApiResponse({
    status: 200,
    description: 'Recipe details',
    type: RecipeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  async findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RecipeResponseDto> {
    return await this.recipesService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update saved recipe',
    description: 'Updates recipe title',
  })
  @ApiResponse({
    status: 200,
    description: 'Recipe updated successfully',
    type: RecipeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe()) dto: UpdateRecipeDto,
  ): Promise<RecipeResponseDto> {
    return await this.recipesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete saved recipe',
    description: 'Permanently deletes a saved recipe',
  })
  @ApiResponse({ status: 200, description: 'Recipe deleted successfully' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  async delete(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return await this.recipesService.delete(user.id, id);
  }

  @Post(':recipeId/ingredients')
  @ApiOperation({
    summary: 'Add an ingredient to a recipe',
    description: 'Adds a new ingredient to an existing saved recipe',
  })
  @ApiResponse({
    status: 201,
    description: 'Ingredient added, returns full recipe',
    type: RecipeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  async addIngredient(
    @CurrentUser() user: User,
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @Body(new ValidationPipe()) dto: RecipeIngredientItemDto,
  ): Promise<RecipeResponseDto> {
    return await this.recipesService.addIngredient(user.id, recipeId, dto);
  }

  @Patch(':recipeId/ingredients/:ingredientId')
  @ApiOperation({
    summary: 'Update a single recipe ingredient',
    description: 'Partially updates a single ingredient in a saved recipe',
  })
  @ApiResponse({
    status: 200,
    description: 'Ingredient updated, returns full recipe',
    type: RecipeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Recipe or ingredient not found' })
  async updateIngredient(
    @CurrentUser() user: User,
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @Param('ingredientId', ParseUUIDPipe) ingredientId: string,
    @Body(new ValidationPipe()) dto: UpdateRecipeIngredientDto,
  ): Promise<RecipeResponseDto> {
    return await this.recipesService.updateIngredient(
      user.id,
      recipeId,
      ingredientId,
      dto,
    );
  }

  @Delete(':recipeId/ingredients/:ingredientId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Remove a single recipe ingredient',
    description: 'Removes a single ingredient from a saved recipe',
  })
  @ApiResponse({ status: 204, description: 'Ingredient removed' })
  @ApiResponse({ status: 404, description: 'Recipe or ingredient not found' })
  async removeIngredient(
    @CurrentUser() user: User,
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @Param('ingredientId', ParseUUIDPipe) ingredientId: string,
  ): Promise<void> {
    return await this.recipesService.removeIngredient(
      user.id,
      recipeId,
      ingredientId,
    );
  }

  // ==================== AI RECIPE OPERATIONS ====================

  @Post('parse')
  @RequireUsageLimit(UsageAction.RECIPE_PARSE)
  @ApiOperation({
    summary: 'Parse recipe text',
    description:
      'Extracts ingredient list from recipe text using AI (OpenAI GPT)',
  })
  @ApiResponse({
    status: 200,
    description: 'Ingredient list successfully extracted',
    type: ParseRecipeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request (empty or invalid recipe text)',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error or OpenAI API error',
  })
  async parseRecipe(
    @CurrentUser() user: User,
    @Body(new ValidationPipe()) parseRecipeDto: ParseRecipeDto,
  ): Promise<ParseRecipeResponseDto> {
    return this.recipesService.parseRecipe(parseRecipeDto, user.id);
  }

  @Post('parse-image')
  @RequireUsageLimit(UsageAction.PARSE_IMAGE)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Parse recipe from image',
    description:
      'Extracts ingredient list from a recipe screenshot/photo using AI vision',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Ingredient list successfully extracted from image',
    type: ParseRecipeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request (missing image, wrong format, or too large)',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error or OpenAI API error',
  })
  async parseRecipeImage(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<ParseRecipeResponseDto> {
    return this.recipesService.parseRecipeImage(file, user.id);
  }

  @Post('single')
  @RequireUsageLimit(UsageAction.RECIPE_GENERATION)
  @ApiOperation({
    summary: 'Generate a single recipe from user query',
    description:
      'Generates one recipe for a specific dish. Accepts a dish name or short query (in any language) and returns a recipe with ingredients and instructions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recipe successfully generated',
    type: SingleRecipeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request (empty query)',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error or OpenAI API error',
  })
  async generateSingleRecipe(
    @CurrentUser() user: User,
    @Body(new ValidationPipe()) dto: GenerateSingleRecipeDto,
  ): Promise<SingleRecipeResponseDto> {
    return this.recipesService.generateSingleRecipe(dto, user.id);
  }

  @Post('meal-plan')
  @RequireUsageLimit(UsageAction.RECIPE_GENERATION)
  @ApiOperation({
    summary: 'Generate a meal plan from user query',
    description:
      'Generates a multi-day meal plan. Accepts arbitrary user query (in any language) and generates multiple recipes with ingredients.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recipes successfully generated',
    type: MealPlanResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request (empty query)',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error or OpenAI API error',
  })
  async generateMealPlan(
    @CurrentUser() user: User,
    @Body(new ValidationPipe()) generateMealPlanDto: GenerateMealPlanDto,
  ): Promise<MealPlanResponseDto> {
    return this.recipesService.generateMealPlan(generateMealPlanDto, user.id);
  }

  @Post('suggest')
  @RequireFeature('canSuggestRecipes')
  @RequireUsageLimit(UsageAction.RECIPE_SUGGEST)
  @ApiOperation({
    summary: 'Suggest recipes from available ingredients',
    description:
      'Analyzes available ingredients and suggests 1-3 realistic recipes that can be made using them. Shows which ingredients match and what additional items are needed.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recipe suggestions successfully generated',
    type: SuggestRecipeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid request (empty ingredients list or invalid ingredient count)',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error or OpenAI API error',
  })
  async suggestRecipe(
    @CurrentUser() user: User,
    @Body(new ValidationPipe()) suggestRecipeDto: SuggestRecipeDto,
  ): Promise<SuggestRecipeResponseDto> {
    return this.recipesService.suggestRecipe(suggestRecipeDto, user.id);
  }

  // ==================== STREAMED AI OPERATIONS (SSE) ====================

  @Post('single/stream')
  @RequireUsageLimit(UsageAction.RECIPE_GENERATION)
  @ApiOperation({
    summary: 'Generate a single recipe (SSE stream)',
    description:
      'Same as POST /recipes/single but streams raw JSON tokens via SSE. Final event contains the parsed result.',
  })
  async generateSingleRecipeStream(
    @CurrentUser() user: User,
    @Body(new ValidationPipe()) dto: GenerateSingleRecipeDto,
    @Res() res: Response,
  ): Promise<void> {
    this.initSse(res);

    try {
      const result = await this.recipesService.generateSingleRecipeStreamed(
        dto,
        user.id,
        (delta) => this.writeSseEvent(res, 'chunk', { text: delta }),
      );
      this.writeSseEvent(res, 'done', result);
    } catch (error) {
      this.writeSseEvent(res, 'error', {
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    res.end();
  }

  @Post('meal-plan/stream')
  @RequireUsageLimit(UsageAction.RECIPE_GENERATION)
  @ApiOperation({
    summary: 'Generate a meal plan (SSE stream)',
    description:
      'Same as POST /recipes/meal-plan but streams raw JSON tokens via SSE. Final event contains the parsed result.',
  })
  async generateMealPlanStream(
    @CurrentUser() user: User,
    @Body(new ValidationPipe()) dto: GenerateMealPlanDto,
    @Res() res: Response,
  ): Promise<void> {
    this.initSse(res);

    try {
      const result = await this.recipesService.generateMealPlanStreamed(
        dto,
        user.id,
        (delta) => this.writeSseEvent(res, 'chunk', { text: delta }),
      );
      this.writeSseEvent(res, 'done', result);
    } catch (error) {
      this.writeSseEvent(res, 'error', {
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    res.end();
  }

  @Post('suggest/stream')
  @RequireFeature('canSuggestRecipes')
  @RequireUsageLimit(UsageAction.RECIPE_SUGGEST)
  @ApiOperation({
    summary: 'Suggest recipes from ingredients (SSE stream)',
    description:
      'Same as POST /recipes/suggest but streams raw JSON tokens via SSE. Final event contains the parsed result.',
  })
  async suggestRecipeStream(
    @CurrentUser() user: User,
    @Body(new ValidationPipe()) suggestRecipeDto: SuggestRecipeDto,
    @Res() res: Response,
  ): Promise<void> {
    this.initSse(res);

    try {
      const result = await this.recipesService.suggestRecipeStreamed(
        suggestRecipeDto,
        user.id,
        (delta) => this.writeSseEvent(res, 'chunk', { text: delta }),
      );
      this.writeSseEvent(res, 'done', result);
    } catch (error) {
      this.writeSseEvent(res, 'error', {
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    res.end();
  }

  private initSse(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
  }

  private writeSseEvent(res: Response, event: string, data: unknown): void {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}
