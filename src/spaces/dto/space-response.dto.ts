import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Space } from '../../entities/space.entity';
import { SpaceRole } from '../enums/space-role.enum';

class SpaceMemberResponseDto {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  id: string;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  userId: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiPropertyOptional({ example: 'https://lh3.googleusercontent.com/...' })
  avatarUrl: string | null;

  @ApiProperty({ enum: SpaceRole, example: SpaceRole.OWNER })
  role: SpaceRole;

  @ApiProperty({ example: '2026-02-10T12:00:00.000Z' })
  joinedAt: string;
}

export class SpaceResponseDto {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  id: string;

  @ApiProperty({ example: 'Family Shopping' })
  name: string;

  @ApiPropertyOptional({ example: 'Shared shopping lists for the family' })
  description: string | null;

  @ApiProperty({ type: [SpaceMemberResponseDto] })
  members: SpaceMemberResponseDto[];

  @ApiProperty({ example: '2026-02-10T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-02-10T12:00:00.000Z' })
  updatedAt: string;

  static fromEntity(entity: Space): SpaceResponseDto {
    const dto = new SpaceResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.members = (entity.members || []).map((member) => ({
      id: member.id,
      userId: member.userId,
      name: member.user?.name ?? '',
      avatarUrl: member.user?.avatarUrl ?? null,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
    }));
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }
}
