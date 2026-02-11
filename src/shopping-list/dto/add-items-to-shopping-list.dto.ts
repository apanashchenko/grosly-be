import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ShoppingListItemDto } from './shopping-list-item.dto';

export class AddItemsToShoppingListDto {
  @ApiProperty({
    description: 'Items to add to the shopping list',
    type: [ShoppingListItemDto],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray({ message: 'Items must be an array' })
  @ArrayMinSize(1, { message: 'At least one item is required' })
  @ArrayMaxSize(100, { message: 'Too many items (max 100)' })
  @ValidateNested({ each: true })
  @Type(() => ShoppingListItemDto)
  items: ShoppingListItemDto[];
}
