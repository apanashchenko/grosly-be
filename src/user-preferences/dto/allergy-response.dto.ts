import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allergy } from '../../entities/allergy.entity';

export class AllergyResponseDto {
  @ApiProperty({
    description: 'Allergy UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({
    description: 'Allergy name',
    example: 'Nuts',
  })
  name: string;

  @ApiProperty({
    description: 'URL-friendly slug',
    example: 'nuts',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Allergy description',
    example: 'Tree nuts and peanuts',
  })
  description: string | null;

  static fromEntity(entity: Allergy): AllergyResponseDto {
    const dto = new AllergyResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.description = entity.description ?? null;
    return dto;
  }
}
