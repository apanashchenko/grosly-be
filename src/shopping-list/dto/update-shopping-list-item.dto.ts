import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsUUID,
  Min,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdateShoppingListItemDto {
  @ApiPropertyOptional({
    description: 'Product name',
    example: 'milk',
    minLength: 1,
    maxLength: 200,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @MinLength(1, { message: 'Product name is too short (min 1 character)' })
  @MaxLength(200, {
    message: 'Product name is too long (max 200 characters)',
  })
  @Matches(/^[^<>{}[\]\\$#@`|~^&;]+$/, {
    message:
      'Product name contains forbidden characters (no <, >, {, }, [, ], \\, $, #, @, `, |, ~, ^, &, ;)',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Product quantity',
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(0, { message: 'Quantity cannot be negative' })
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Unit of measurement',
    example: 'pcs',
    minLength: 1,
    maxLength: 50,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @MinLength(1, { message: 'Unit is too short (min 1 character)' })
  @MaxLength(50, { message: 'Unit is too long (max 50 characters)' })
  @Matches(/^[^<>{}[\]\\$#@`|~^&;]+$/, {
    message:
      'Unit contains forbidden characters (no <, >, {, }, [, ], \\, $, #, @, `, |, ~, ^, &, ;)',
  })
  unit?: string;

  @ApiPropertyOptional({
    description: 'Additional note (e.g. "to taste"). Send null to clear.',
    example: 'to taste',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Note is too long (max 100 characters)' })
  note?: string | null;

  @ApiPropertyOptional({
    description: 'Whether the product has been purchased',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Purchased must be a boolean' })
  purchased?: boolean;

  @ApiPropertyOptional({
    description: 'Category UUID (from GET /categories). Send null to clear.',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  categoryId?: string | null;

  @ApiPropertyOptional({
    description: 'Item position in the list (0-based)',
    example: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Position must be a number' })
  @Min(0, { message: 'Position cannot be negative' })
  position?: number;
}
