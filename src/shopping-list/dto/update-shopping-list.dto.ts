import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  MinLength,
  MaxLength,
  Matches,
  IsUUID,
  IsNumber,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShoppingListItemDto } from './shopping-list-item.dto';

export class ItemPositionDto {
  @ApiProperty({
    description: 'Item UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID('4', { message: 'id must be a valid UUID' })
  id: string;

  @ApiProperty({
    description: 'New position (0-based)',
    example: 0,
  })
  @IsNumber({}, { message: 'Position must be a number' })
  @Min(0, { message: 'Position cannot be negative' })
  position: number;
}

export class UpdateShoppingListDto {
  @ApiPropertyOptional({
    description: 'Updated shopping list name',
    example: 'Weekend groceries',
    minLength: 1,
    maxLength: 200,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @MinLength(1, { message: 'Name is too short (min 1 character)' })
  @MaxLength(200, { message: 'Name is too long (max 200 characters)' })
  @Matches(/^[^<>{}[\]\\$#@`|~^&;]+$/, {
    message:
      'Name contains forbidden characters (no <, >, {, }, [, ], \\, $, #, @, `, |, ~, ^, &, ;)',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated list of products to buy',
    type: [ShoppingListItemDto],
    minItems: 1,
    maxItems: 100,
  })
  @IsOptional()
  @IsArray({ message: 'Items must be an array' })
  @ArrayMinSize(1, { message: 'At least one item is required' })
  @ArrayMaxSize(100, { message: 'Too many items (max 100)' })
  @ValidateNested({ each: true })
  @Type(() => ShoppingListItemDto)
  items?: ShoppingListItemDto[];

  @ApiPropertyOptional({
    description: 'Whether items should be grouped by category on the client',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'groupedByCategories must be a boolean' })
  groupedByCategories?: boolean;

  @ApiPropertyOptional({
    description:
      'Batch update item positions (for reordering). Does not replace items, only updates positions of existing items by their ID.',
    type: [ItemPositionDto],
  })
  @IsOptional()
  @IsArray({ message: 'itemPositions must be an array' })
  @ArrayMinSize(1, { message: 'At least one position update is required' })
  @ArrayMaxSize(100, { message: 'Too many position updates (max 100)' })
  @ValidateNested({ each: true })
  @Type(() => ItemPositionDto)
  itemPositions?: ItemPositionDto[];
}
