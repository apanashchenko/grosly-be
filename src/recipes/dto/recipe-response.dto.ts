import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Recipe } from '../../entities/recipe.entity';
import { RecipeSource } from '../enums/recipe-source.enum';

export class RecipeResponseDto {
  @ApiProperty({
    description: 'Unique identifier (UUID)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({
    description: 'Recipe title',
    example: 'Classic Ukrainian Borscht',
  })
  title: string;

  @ApiProperty({
    description: 'Recipe source type',
    enum: RecipeSource,
    example: RecipeSource.PARSED,
  })
  source: RecipeSource;

  @ApiProperty({
    description: 'Full recipe text content for display',
    example:
      'Borscht\n\nIngredients:\n- beetroot 2 pcs\n- potatoes 3 pcs\n\nInstructions:\n1. Peel and dice beetroot...',
  })
  text: string;

  @ApiProperty({
    description: 'Creation date (ISO 8601)',
    example: '2026-02-11T12:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update date (ISO 8601)',
    example: '2026-02-11T12:00:00.000Z',
  })
  updatedAt: string;

  @ApiPropertyOptional({
    description: 'Linked shopping list ID (null if not linked)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    nullable: true,
  })
  shoppingListId: string | null;

  static fromEntity(entity: Recipe): RecipeResponseDto {
    const dto = new RecipeResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.source = entity.source;
    dto.text = entity.text;
    dto.shoppingListId = entity.shoppingListId ?? null;
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }
}

export class RecipeListItemDto {
  @ApiProperty({
    description: 'Unique identifier (UUID)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({
    description: 'Recipe title',
    example: 'Classic Ukrainian Borscht',
  })
  title: string;

  @ApiProperty({
    description: 'Recipe source type',
    enum: RecipeSource,
    example: RecipeSource.PARSED,
  })
  source: RecipeSource;

  @ApiProperty({
    description: 'Creation date (ISO 8601)',
    example: '2026-02-11T12:00:00.000Z',
  })
  createdAt: string;

  @ApiPropertyOptional({
    description: 'Linked shopping list ID (null if not linked)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    nullable: true,
  })
  shoppingListId: string | null;

  static fromEntity(entity: Recipe): RecipeListItemDto {
    const dto = new RecipeListItemDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.source = entity.source;
    dto.shoppingListId = entity.shoppingListId ?? null;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}
