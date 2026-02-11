import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DietaryRestriction } from '../../entities/dietary-restriction.entity';

export class DietaryRestrictionResponseDto {
  @ApiProperty({
    description: 'Dietary restriction UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({
    description: 'Dietary restriction name',
    example: 'Vegetarian',
  })
  name: string;

  @ApiProperty({
    description: 'URL-friendly slug',
    example: 'vegetarian',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Dietary restriction description',
    example: 'No meat or fish products',
  })
  description: string | null;

  static fromEntity(entity: DietaryRestriction): DietaryRestrictionResponseDto {
    const dto = new DietaryRestrictionResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.description = entity.description ?? null;
    return dto;
  }
}
