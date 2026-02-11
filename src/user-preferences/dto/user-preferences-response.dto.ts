import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserPreferences } from '../../entities/user-preferences.entity';
import { AllergyResponseDto } from './allergy-response.dto';
import { DietaryRestrictionResponseDto } from './dietary-restriction-response.dto';

export class UserPreferencesResponseDto {
  @ApiProperty({
    description: 'User allergies',
    type: [AllergyResponseDto],
  })
  allergies: AllergyResponseDto[];

  @ApiProperty({
    description: 'User dietary restrictions',
    type: [DietaryRestrictionResponseDto],
  })
  dietaryRestrictions: DietaryRestrictionResponseDto[];

  @ApiProperty({
    description: 'Default number of servings',
    example: 4,
  })
  defaultServings: number;

  @ApiPropertyOptional({
    description:
      'Free-text notes about allergies or dietary needs not covered by predefined lists',
    example: 'I am intolerant to nightshades (tomatoes, peppers, eggplant)',
  })
  customNotes: string | null;

  static fromEntity(entity: UserPreferences): UserPreferencesResponseDto {
    const dto = new UserPreferencesResponseDto();
    dto.allergies = (entity.allergies ?? []).map((a) =>
      AllergyResponseDto.fromEntity(a),
    );
    dto.dietaryRestrictions = (entity.dietaryRestrictions ?? []).map((dr) =>
      DietaryRestrictionResponseDto.fromEntity(dr),
    );
    dto.defaultServings = entity.defaultServings;
    dto.customNotes = entity.customNotes ?? null;
    return dto;
  }
}
