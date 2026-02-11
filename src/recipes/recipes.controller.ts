import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RecipesService } from './recipes.service';
import { ParseRecipeDto } from './dto/parse-recipe.dto';
import { ParseRecipeResponseDto } from './dto/ingredient.dto';
import { GenerateMealPlanDto, MealPlanResponseDto } from './dto/meal-plan.dto';
import {
  SuggestRecipeDto,
  SuggestRecipeResponseDto,
} from './dto/suggest-recipe.dto';
import { CurrentUser } from '../auth/decorators';
import { User } from '../entities/user.entity';

@ApiTags('recipes')
@ApiBearerAuth()
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post('parse')
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

  @Post('generate')
  @ApiOperation({
    summary: 'Generate recipes from user query',
    description:
      'Universal endpoint for recipe generation. Accepts arbitrary user query (in any language) and generates recipes with ingredients.',
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
    @Body(new ValidationPipe()) generateMealPlanDto: GenerateMealPlanDto,
  ): Promise<MealPlanResponseDto> {
    return this.recipesService.generateMealPlan(generateMealPlanDto);
  }

  @Post('suggest')
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
    @Body(new ValidationPipe()) suggestRecipeDto: SuggestRecipeDto,
  ): Promise<SuggestRecipeResponseDto> {
    return this.recipesService.suggestRecipe(suggestRecipeDto);
  }
}
