import { Module } from '@nestjs/common';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { AiModule } from '../ai/ai.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [AiModule, CategoriesModule],
  controllers: [RecipesController],
  providers: [RecipesService],
})
export class RecipesModule {}
