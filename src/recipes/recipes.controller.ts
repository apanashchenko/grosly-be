import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { ParseRecipeDto } from './dto/parse-recipe.dto';
import { ParseRecipeResponseDto } from './dto/ingredient.dto';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post('parse')
  async parseRecipe(
    @Body(new ValidationPipe()) parseRecipeDto: ParseRecipeDto,
  ): Promise<ParseRecipeResponseDto> {
    return this.recipesService.parseRecipe(parseRecipeDto);
  }
}
