import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from '../entities/store.entity';
import { StoreCategory } from '../entities/store-category.entity';
import { StoreProduct } from '../entities/store-product.entity';
import { Category } from '../entities/category.entity';
import { StoreProductsController } from './store-products.controller';
import { StoreProductsService } from './store-products.service';
import { CsvParserService } from './csv-parser.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Store, StoreCategory, StoreProduct, Category]),
  ],
  controllers: [StoreProductsController],
  providers: [StoreProductsService, CsvParserService],
  exports: [StoreProductsService],
})
export class StoreProductsModule {}
