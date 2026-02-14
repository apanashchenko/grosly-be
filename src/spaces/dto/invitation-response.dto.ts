import { ApiProperty } from '@nestjs/swagger';
import { SpaceInvitation } from '../../entities/space-invitation.entity';
import { InvitationStatus } from '../enums/invitation-status.enum';

export class InvitationResponseDto {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  id: string;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  spaceId: string;

  @ApiProperty({ example: 'Family Shopping' })
  spaceName: string;

  @ApiProperty({ example: 'John Doe' })
  inviterName: string;

  @ApiProperty({
    example: 'https://lh3.googleusercontent.com/a/example',
    nullable: true,
  })
  inviterAvatarUrl: string | null;

  @ApiProperty({ enum: InvitationStatus })
  status: InvitationStatus;

  @ApiProperty({ example: '2026-02-10T12:00:00.000Z' })
  createdAt: string;

  static fromEntity(entity: SpaceInvitation): InvitationResponseDto {
    const dto = new InvitationResponseDto();
    dto.id = entity.id;
    dto.spaceId = entity.spaceId;
    dto.spaceName = entity.space?.name ?? '';
    dto.inviterName = entity.inviter?.name ?? '';
    dto.inviterAvatarUrl = entity.inviter?.avatarUrl ?? null;
    dto.status = entity.status;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}
