import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({
    description: 'User UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({ description: 'User email', example: 'user@gmail.com' })
  email: string;

  @ApiProperty({ description: 'User display name', example: 'John Doe' })
  name: string;

  @ApiProperty({
    description: 'User avatar URL',
    example: 'https://lh3.googleusercontent.com/...',
  })
  avatarUrl: string;

  @ApiProperty({ description: 'Interface language', example: 'uk' })
  language: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token (short-lived)' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token (long-lived)' })
  refreshToken: string;

  @ApiProperty({
    description: 'Authenticated user profile',
    type: AuthUserDto,
  })
  user: AuthUserDto;
}
