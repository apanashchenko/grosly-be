import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShoppingList } from '../../entities/shopping-list.entity';

class CreatedByInfoDto {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;
}

class CategoryInfoDto {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  id: string;

  @ApiProperty({ example: 'Dairy' })
  name: string;

  @ApiPropertyOptional({ example: '🥛' })
  icon: string | null;
}

class ShoppingListItemResponseDto {
  @ApiProperty({
    description: 'Item unique identifier (UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({ description: 'Product name', example: 'milk' })
  name: string;

  @ApiProperty({ description: 'Product quantity', example: 2 })
  quantity: number;

  @ApiProperty({ description: 'Unit of measurement', example: 'pcs' })
  unit: string;

  @ApiProperty({ description: 'Whether the product has been purchased' })
  purchased: boolean;

  @ApiPropertyOptional({
    description: 'Category info (null if not assigned)',
    type: CategoryInfoDto,
    nullable: true,
  })
  category: CategoryInfoDto | null;

  @ApiProperty({ description: 'Item position in the list', example: 0 })
  position: number;

  @ApiPropertyOptional({
    description: 'User who created this item',
    type: CreatedByInfoDto,
    nullable: true,
  })
  createdBy: CreatedByInfoDto | null;
}

export class ShoppingListResponseDto {
  @ApiProperty({
    description: 'Unique identifier (UUID)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({
    description: 'Shopping list name',
    example: 'Weekly groceries',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Space ID (null for personal lists)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    nullable: true,
  })
  spaceId: string | null;

  @ApiProperty({
    description: 'Whether items should be grouped by category on the client',
    example: false,
  })
  groupedByCategories: boolean;

  @ApiProperty({
    description: 'Version number for optimistic locking',
    example: 1,
  })
  version: number;

  @ApiProperty({
    description: 'List of products to buy',
    type: [ShoppingListItemResponseDto],
  })
  items: ShoppingListItemResponseDto[];

  @ApiProperty({
    description: 'Creation date (ISO 8601)',
    example: '2026-02-09T12:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update date (ISO 8601)',
    example: '2026-02-09T12:00:00.000Z',
  })
  updatedAt: string;

  static fromEntity(entity: ShoppingList): ShoppingListResponseDto {
    const dto = new ShoppingListResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.spaceId = entity.spaceId ?? null;
    dto.groupedByCategories = entity.groupedByCategories;
    dto.version = entity.version;
    dto.items = (entity.items || [])
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: Number(item.quantity),
        unit: item.unit,
        purchased: item.purchased,
        category: item.category
          ? {
              id: item.category.id,
              name: item.category.name,
              icon: item.category.icon ?? null,
            }
          : null,
        position: item.position,
        createdBy: item.createdBy
          ? { id: item.createdBy.id, name: item.createdBy.name }
          : null,
      }));
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }
}
