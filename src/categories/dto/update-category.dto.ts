import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: 'Category name',
    example: 'Dairy',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @MinLength(1, { message: 'Category name is too short (min 1 character)' })
  @MaxLength(100, { message: 'Category name is too long (max 100 characters)' })
  @Matches(/^[^<>{}[\]\\$#@`|~^&;]+$/, {
    message: 'Category name contains forbidden characters',
  })
  name?: string;

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
