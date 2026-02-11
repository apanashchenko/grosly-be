import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Category } from '../../entities/category.entity';

export class CategoryResponseDto {
  @ApiProperty({
    description: 'Category UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Dairy',
  })
  name: string;

  @ApiProperty({
    description: 'URL-friendly slug',
    example: 'dairy',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Category icon (emoji or icon name)',
    example: '🥛',
  })
  icon: string | null;

  @ApiProperty({
    description: 'Whether this is a user-created custom category',
    example: false,
  })
  isCustom: boolean;

  static fromEntity(entity: Category): CategoryResponseDto {
    const dto = new CategoryResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.icon = entity.icon ?? null;
    dto.isCustom = entity.userId !== null;
    return dto;
  }
}
