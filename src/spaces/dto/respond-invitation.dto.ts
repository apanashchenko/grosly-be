import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum InvitationAction {
  ACCEPT = 'ACCEPT',
  DECLINE = 'DECLINE',
}

export class RespondInvitationDto {
  @ApiProperty({
    description: 'Accept or decline the invitation',
    enum: InvitationAction,
    example: InvitationAction.ACCEPT,
  })
  @IsEnum(InvitationAction, {
    message: 'Action must be either ACCEPT or DECLINE',
  })
  action: InvitationAction;
}
