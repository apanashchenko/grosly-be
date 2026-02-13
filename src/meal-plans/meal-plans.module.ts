import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealPlansController } from './meal-plans.controller';
import { MealPlansService } from './meal-plans.service';
import { MealPlan } from '../entities/meal-plan.entity';
import { MealPlanRecipe } from '../entities/meal-plan-recipe.entity';
import { Recipe } from '../entities/recipe.entity';
import { RecipesModule } from '../recipes/recipes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MealPlan, MealPlanRecipe, Recipe]),
    RecipesModule,
  ],
  controllers: [MealPlansController],
  providers: [MealPlansService],
  exports: [MealPlansService],
})
export class MealPlansModule {}
