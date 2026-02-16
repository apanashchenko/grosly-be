import { ApiProperty } from '@nestjs/swagger';

export class UploadCsvResponseDto {
  @ApiProperty({ example: 150, description: 'Number of new products created' })
  created: number;

  @ApiProperty({
    example: 42,
    description: 'Number of existing products updated',
  })
  updated: number;

  @ApiProperty({
    example: ['Row 5: missing price'],
    description: 'Parsing or processing errors (non-fatal)',
  })
  errors: string[];

  @ApiProperty({
    example: 1234,
    description: 'Processing time in milliseconds',
  })
  durationMs: number;
}
