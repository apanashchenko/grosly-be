import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Dairy',
    minLength: 1,
    maxLength: 100,
  })
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @IsNotEmpty({ message: 'Category name cannot be empty' })
  @MinLength(1, { message: 'Category name is too short (min 1 character)' })
  @MaxLength(100, { message: 'Category name is too long (max 100 characters)' })
  @Matches(/^[^<>{}[\]\\$#@`|~^&;]+$/, {
    message: 'Category name contains forbidden characters',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Category icon (emoji or icon name)',
    example: '🥛',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Icon is too long (max 50 characters)' })
  icon?: string;
}
