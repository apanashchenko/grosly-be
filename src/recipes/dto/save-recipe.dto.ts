import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsInt,
  IsUUID,
  MaxLength,
  MinLength,
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecipeSource } from '../enums/recipe-source.enum';

export class RecipeIngredientItemDto {
  @ApiProperty({
    description: 'Ingredient name',
    example: 'beetroot',
    minLength: 1,
    maxLength: 200,
  })
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @IsNotEmpty({ message: 'Ingredient name cannot be empty' })
  @MinLength(1, { message: 'Ingredient name is too short (min 1 character)' })
  @MaxLength(200, {
    message: 'Ingredient name is too long (max 200 characters)',
  })
  @Matches(/^[^<>{}[\]\\$#@`|~^&;]+$/, {
    message: 'Ingredient name contains forbidden characters',
  })
  name: string;

  @ApiProperty({
    description: 'Quantity',
    example: 2,
    minimum: 0,
  })
  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(0, { message: 'Quantity cannot be negative' })
  quantity: number;

  @ApiProperty({
    description: 'Unit of measurement',
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
    description: 'Additional note (e.g. "to taste")',
    example: 'to taste',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Note is too long (max 100 characters)' })
  note?: string | null;

  @ApiPropertyOptional({
    description: 'Category UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  categoryId?: string;
}

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
    maxLength: 5000,
  })
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text: string;

  @ApiPropertyOptional({
    description:
      'Original user input that was used to generate/parse this recipe',
    example: 'борщ на 4 порції',
    maxLength: 5000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  originalInput?: string;

  @ApiPropertyOptional({
    description: 'Day number in a meal plan (defaults to 1)',
    example: 1,
    default: 1,
    minimum: 1,
    maximum: 7,
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Day number must be at least 1' })
  @Max(7, { message: 'Day number must be at most 7' })
  dayNumber?: number;

  @ApiProperty({
    description: 'Recipe ingredients',
    type: [RecipeIngredientItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientItemDto)
  ingredients: RecipeIngredientItemDto[];
}

export class UpdateRecipeDto {
  @ApiPropertyOptional({
    description: 'New recipe title',
    example: 'My Borscht Recipe',
    maxLength: 300,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated recipe text content',
    example:
      'Borscht\n\nIngredients:\n- beetroot 2 pcs\n- potatoes 3 pcs\n\nInstructions:\n1. Peel and dice beetroot...',
    maxLength: 5000,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text?: string;

  @ApiPropertyOptional({
    description: 'Updated ingredients (full replace)',
    type: [RecipeIngredientItemDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientItemDto)
  ingredients?: RecipeIngredientItemDto[];
}

export class UpdateRecipeIngredientDto {
  @ApiPropertyOptional({
    description: 'Ingredient name',
    example: 'beetroot',
    minLength: 1,
    maxLength: 200,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @IsNotEmpty({ message: 'Ingredient name cannot be empty' })
  @MinLength(1, { message: 'Ingredient name is too short (min 1 character)' })
  @MaxLength(200, {
    message: 'Ingredient name is too long (max 200 characters)',
  })
  @Matches(/^[^<>{}[\]\\$#@`|~^&;]+$/, {
    message: 'Ingredient name contains forbidden characters',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Quantity',
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
    maxLength: 50,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @MaxLength(50, { message: 'Unit is too long (max 50 characters)' })
  unit?: string;

  @ApiPropertyOptional({
    description: 'Additional note (e.g. "to taste")',
    example: 'to taste',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Note is too long (max 100 characters)' })
  note?: string | null;

  @ApiPropertyOptional({
    description: 'Category UUID (send null to clear)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  categoryId?: string | null;

  @ApiPropertyOptional({
    description: 'Position for ordering',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Position must be a number' })
  @Min(0, { message: 'Position cannot be negative' })
  position?: number;
}
