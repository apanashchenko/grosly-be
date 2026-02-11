import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsUUID,
  Min,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ShoppingListItemDto {
  @ApiProperty({
    description: 'Product name',
    example: 'milk',
    minLength: 1,
    maxLength: 200,
  })
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @IsNotEmpty({ message: 'Product name cannot be empty' })
  @MinLength(1, { message: 'Product name is too short (min 1 character)' })
  @MaxLength(200, { message: 'Product name is too long (max 200 characters)' })
  @Matches(/^[^<>{}[\]\\$#@`|~^&;]+$/, {
    message:
      'Product name contains forbidden characters (no <, >, {, }, [, ], \\, $, #, @, `, |, ~, ^, &, ;)',
  })
  name: string;

  @ApiProperty({
    description: 'Product quantity',
    example: 2,
    minimum: 0,
  })
  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(0, { message: 'Quantity cannot be negative' })
  quantity: number;

  @ApiProperty({
    description:
      'Unit of measurement (empty string allowed for "to taste" items)',
    example: 'pcs',
    maxLength: 50,
  })
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @MaxLength(50, { message: 'Unit is too long (max 50 characters)' })
  unit: string;

  @ApiPropertyOptional({
    description: 'Whether the product has been purchased',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Purchased must be a boolean' })
  purchased?: boolean;

  @ApiPropertyOptional({
    description: 'Category UUID (from GET /categories)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  categoryId?: string;
}
