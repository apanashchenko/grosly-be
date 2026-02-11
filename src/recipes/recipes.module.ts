import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { AiModule } from '../ai/ai.module';
import { CategoriesModule } from '../categories/categories.module';
import { ShoppingListModule } from '../shopping-list/shopping-list.module';
import { Recipe } from '../entities/recipe.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recipe]),
    AiModule,
    CategoriesModule,
    ShoppingListModule,
  ],
  controllers: [RecipesController],
  providers: [RecipesService],
})
export class RecipesModule {}
