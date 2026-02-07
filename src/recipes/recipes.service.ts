import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { ParseRecipeDto } from './dto/parse-recipe.dto';
import { ParseRecipeResponseDto } from './dto/ingredient.dto';

@Injectable()
export class RecipesService {
  constructor(private aiService: AiService) {}

  async parseRecipe(
    parseRecipeDto: ParseRecipeDto,
  ): Promise<ParseRecipeResponseDto> {
    const ingredients = await this.aiService.extractIngredientsFromRecipe(
      parseRecipeDto.recipeText,
    );

    return {
      ingredients,
    };
  }
}
