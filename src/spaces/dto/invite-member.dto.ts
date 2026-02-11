import { IsEmail, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class InviteMemberDto {
  @ApiProperty({
    description: 'Email of the user to invite',
    example: 'friend@example.com',
  })
  @Transform(({ value }: { value: string }) => value?.trim()?.toLowerCase())
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(254, { message: 'Email is too long' })
  email: string;
}
