import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { AiModule } from '../ai/ai.module';
import { CategoriesModule } from '../categories/categories.module';
import { Recipe } from '../entities/recipe.entity';
import { RecipeIngredient } from '../entities/recipe-ingredient.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recipe, RecipeIngredient]),
    AiModule,
    CategoriesModule,
  ],
  controllers: [RecipesController],
  providers: [RecipesService],
  exports: [RecipesService],
})
export class RecipesModule {}
