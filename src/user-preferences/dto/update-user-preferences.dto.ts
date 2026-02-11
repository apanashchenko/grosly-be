import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsArray,
  IsUUID,
  IsInt,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({
    description: 'Array of allergy UUIDs to set for the user',
    example: ['f47ac10b-58cc-4372-a567-0e02b2c3d479'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  allergyIds?: string[];

  @ApiPropertyOptional({
    description: 'Array of dietary restriction UUIDs to set for the user',
    example: ['f47ac10b-58cc-4372-a567-0e02b2c3d479'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  dietaryRestrictionIds?: string[];

  @ApiPropertyOptional({
    description: 'Default number of servings for recipe generation',
    example: 4,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  defaultServings?: number;

  @ApiPropertyOptional({
    description:
      'Free-text notes about allergies or dietary needs not covered by predefined lists. Passed to AI as-is.',
    example: 'I am intolerant to nightshades (tomatoes, peppers, eggplant)',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customNotes?: string | null;
}
