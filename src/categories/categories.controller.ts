import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CurrentUser } from '../auth/decorators';
import { User } from '../entities/user.entity';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all categories',
    description:
      "Returns system (default) categories and the current user's custom categories.",
  })
  @ApiResponse({
    status: 200,
    description: 'List of categories',
    type: [CategoryResponseDto],
  })
  async findAll(@CurrentUser() user: User): Promise<CategoryResponseDto[]> {
    const categories = await this.categoriesService.findAll(user.id);
    return categories.map((cat) => CategoryResponseDto.fromEntity(cat));
  }

  @Post()
  @ApiOperation({
    summary: 'Create a custom category',
    description: 'Creates a new custom category for the authenticated user.',
  })
  @ApiResponse({
    status: 201,
    description: 'Category created',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Category with this name already exists',
  })
  async create(
    @CurrentUser() user: User,
    @Body(new ValidationPipe()) dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoriesService.create(user.id, dto);
    return CategoryResponseDto.fromEntity(category);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a custom category',
    description:
      "Updates a user's custom category. System categories cannot be modified.",
  })
  @ApiParam({
    name: 'id',
    description: 'Category UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 200,
    description: 'Category updated',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Cannot modify system categories' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async update(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ValidationPipe()) dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoriesService.update(user.id, id, dto);
    return CategoryResponseDto.fromEntity(category);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a custom category',
    description:
      "Deletes a user's custom category. System categories cannot be deleted.",
  })
  @ApiParam({
    name: 'id',
    description: 'Category UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({ status: 204, description: 'Category deleted' })
  @ApiResponse({ status: 403, description: 'Cannot delete system categories' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async delete(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.categoriesService.delete(user.id, id);
  }
}
