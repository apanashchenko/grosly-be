import {
  Controller,
  Post,
  Param,
  Headers,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { StoreProductsService } from './store-products.service';
import { UploadCsvResponseDto } from './dto/upload-csv-response.dto';

@ApiTags('store-products')
@Controller('stores')
export class StoreProductsController {
  constructor(
    private readonly storeProductsService: StoreProductsService,
    private readonly config: ConfigService,
  ) {}

  @Post(':storeSlug/products/upload-csv')
  @Public()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload store products via CSV',
    description:
      'Accepts a CSV file with product data (name, price, unit, category) and upserts products for the specified store.',
  })
  @ApiHeader({ name: 'X-Upload-Key', required: true })
  @ApiParam({ name: 'storeSlug', example: 'atb' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Upload result with created/updated counts',
    type: UploadCsvResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid CSV format or missing columns',
  })
  @ApiResponse({ status: 401, description: 'Invalid upload API key' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async uploadCsv(
    @Param('storeSlug') storeSlug: string,
    @Headers('x-upload-key') apiKey: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<UploadCsvResponseDto> {
    this.validateApiKey(apiKey);
    return this.storeProductsService.uploadCsv(storeSlug, file.buffer);
  }

  private validateApiKey(apiKey: string): void {
    const expected = this.config.get<string>('UPLOAD_API_KEY');
    if (!expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid upload API key');
    }
  }
}
