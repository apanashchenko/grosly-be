import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsNotEmpty,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecipeSource } from '../enums/recipe-source.enum';
import { ShoppingListItemDto } from '../../shopping-list/dto/shopping-list-item.dto';

export class SaveRecipeDto {
  @ApiPropertyOptional({
    description: 'Recipe title (optional, auto-generated if not provided)',
    example: 'Classic Ukrainian Borscht',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiProperty({
    description: 'Recipe source type',
    enum: RecipeSource,
    example: RecipeSource.PARSED,
  })
  @IsEnum(RecipeSource)
  @IsNotEmpty()
  source: RecipeSource;

  @ApiProperty({
    description: 'Full recipe text content (AI-formatted recipe for display)',
    example:
      'Borscht\n\nIngredients:\n- beetroot 2 pcs\n- potatoes 3 pcs\n\nInstructions:\n1. Peel and dice beetroot...',
    maxLength: 3000,
  })
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  text: string;

  @ApiPropertyOptional({
    description: 'Whether to also add ingredients to a shopping list',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isAddToShoppingList?: boolean;

  @ApiPropertyOptional({
    description:
      'Ingredients for shopping list (required when isAddToShoppingList=true)',
    type: [ShoppingListItemDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ShoppingListItemDto)
  items?: ShoppingListItemDto[];

  @ApiPropertyOptional({
    description:
      'Name for the auto-created shopping list (only used when isAddToShoppingList=true)',
    example: 'Borscht groceries',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @MaxLength(100)
  shoppingListName?: string;
}

export class UpdateRecipeDto {
  @ApiProperty({
    description: 'New recipe title',
    example: 'My Borscht Recipe',
    maxLength: 300,
  })
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;
}
