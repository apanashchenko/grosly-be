import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpaceInvitation } from '../../entities/space-invitation.entity';
import { InvitationStatus } from '../enums/invitation-status.enum';

export class SpaceInvitationResponseDto {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  inviteeName: string | null;

  @ApiPropertyOptional({ example: 'https://lh3.googleusercontent.com/...' })
  inviteeAvatarUrl: string | null;

  @ApiProperty({ enum: InvitationStatus })
  status: InvitationStatus;

  @ApiProperty({ example: '2026-02-10T12:00:00.000Z' })
  createdAt: string;

  static fromEntity(entity: SpaceInvitation): SpaceInvitationResponseDto {
    const dto = new SpaceInvitationResponseDto();
    dto.id = entity.id;
    dto.email = entity.email;
    const accepted = entity.status === InvitationStatus.ACCEPTED;
    dto.inviteeName = accepted ? (entity.invitee?.name ?? null) : null;
    dto.inviteeAvatarUrl = accepted
      ? (entity.invitee?.avatarUrl ?? null)
      : null;
    dto.status = entity.status;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}
