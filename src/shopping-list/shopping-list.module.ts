import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShoppingListController } from './shopping-list.controller';
import { ShoppingListService } from './shopping-list.service';
import { ShoppingList } from '../entities/shopping-list.entity';
import { ShoppingListItem } from '../entities/shopping-list-item.entity';
import { AiModule } from '../ai/ai.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShoppingList, ShoppingListItem]),
    AiModule,
    CategoriesModule,
  ],
  controllers: [ShoppingListController],
  providers: [ShoppingListService],
})
export class ShoppingListModule {}
