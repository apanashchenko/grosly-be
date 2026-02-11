import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CombineShoppingListsDto {
  @ApiPropertyOptional({
    description:
      'Name for the combined shopping list (optional, auto-generated if not provided)',
    example: 'Combined groceries',
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

  @ApiProperty({
    description: 'UUIDs of shopping lists to combine (2-10)',
    example: [
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    ],
    minItems: 2,
    maxItems: 10,
  })
  @IsArray({ message: 'listIds must be an array' })
  @ArrayMinSize(2, { message: 'At least 2 shopping lists are required' })
  @ArrayMaxSize(10, { message: 'Too many lists (max 10)' })
  @IsUUID('4', { each: true, message: 'Each listId must be a valid UUID' })
  listIds: string[];

  @ApiPropertyOptional({
    description: 'Whether items should be grouped by category on the client',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'groupedByCategories must be a boolean' })
  groupedByCategories?: boolean;
}
