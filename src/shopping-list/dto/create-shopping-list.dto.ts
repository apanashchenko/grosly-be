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
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShoppingListItemDto } from './shopping-list-item.dto';

export class CreateShoppingListDto {
  @ApiPropertyOptional({
    description:
      'Shopping list name (optional, auto-generated if not provided)',
    example: 'Weekly groceries',
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
    description: 'Whether items should be grouped by category on the client',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'groupedByCategories must be a boolean' })
  groupedByCategories?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the shopping list is pinned for the user',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isPinned must be a boolean' })
  isPinned?: boolean;

  @ApiPropertyOptional({
    description: 'Short label for additional info',
    example: 'Party',
    maxLength: 20,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString({ message: 'label must be a string' })
  @MinLength(1, { message: 'Label is too short (min 1 character)' })
  @MaxLength(20, { message: 'Label is too long (max 20 characters)' })
  label?: string;

  @ApiProperty({
    description: 'List of products to buy',
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
