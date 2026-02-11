import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateSpaceDto {
  @ApiProperty({
    description: 'Space name',
    example: 'Family Shopping',
    minLength: 1,
    maxLength: 200,
  })
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @MinLength(1, { message: 'Name is too short (min 1 character)' })
  @MaxLength(200, { message: 'Name is too long (max 200 characters)' })
  @Matches(/^[^<>{}[\]\\$#@`|~^&;]+$/, {
    message: 'Name contains forbidden characters',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Space description',
    example: 'Shared shopping lists for the family',
    maxLength: 500,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @MaxLength(500, { message: 'Description is too long (max 500 characters)' })
  description?: string;
}
