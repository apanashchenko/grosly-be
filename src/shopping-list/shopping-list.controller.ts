import {
  Controller,
  Get,
  Post,
  Patch,
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
import { ShoppingListService } from './shopping-list.service';
import { CreateShoppingListDto } from './dto/create-shopping-list.dto';
import { UpdateShoppingListDto } from './dto/update-shopping-list.dto';
import { AddItemsToShoppingListDto } from './dto/add-items-to-shopping-list.dto';
import { UpdateShoppingListItemDto } from './dto/update-shopping-list-item.dto';
import { ShoppingListResponseDto } from './dto/shopping-list-response.dto';
import { CurrentUser } from '../auth/decorators';
import { User } from '../entities/user.entity';

@ApiTags('shopping-list')
@ApiBearerAuth()
@Controller('shopping-list')
export class ShoppingListController {
  constructor(private readonly shoppingListService: ShoppingListService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all shopping lists',
    description:
      'Returns all shopping lists belonging to the authenticated user, ordered by creation date (newest first).',
  })
  @ApiResponse({
    status: 200,
    description: 'List of shopping lists',
    type: [ShoppingListResponseDto],
  })
  async findAll(@CurrentUser() user: User): Promise<ShoppingListResponseDto[]> {
    const lists = await this.shoppingListService.findAllByUser(user.id);
    return lists.map((list) => ShoppingListResponseDto.fromEntity(list));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a shopping list by ID',
    description:
      'Returns a single shopping list by its UUID. Only the owner can access it.',
  })
  @ApiParam({
    name: 'id',
    description: 'Shopping list UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 200,
    description: 'Shopping list found',
    type: ShoppingListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Shopping list not found' })
  async findOne(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ShoppingListResponseDto> {
    const list = await this.shoppingListService.findOne(user.id, id);
    return ShoppingListResponseDto.fromEntity(list);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a shopping list',
    description:
      'Creates a shopping list from a list of products with quantities. If no name is provided, a default name is generated.',
  })
  @ApiResponse({
    status: 201,
    description: 'Shopping list successfully created',
    type: ShoppingListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request (empty items list or validation errors)',
  })
  async create(
    @CurrentUser() user: User,
    @Body(new ValidationPipe()) dto: CreateShoppingListDto,
  ): Promise<ShoppingListResponseDto> {
    const list = await this.shoppingListService.create(user.id, dto);
    return ShoppingListResponseDto.fromEntity(list);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a shopping list',
    description:
      'Updates a shopping list by ID. Only the owner can update it. When items are provided, they fully replace existing items.',
  })
  @ApiParam({
    name: 'id',
    description: 'Shopping list UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 200,
    description: 'Shopping list successfully updated',
    type: ShoppingListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or invalid UUID format',
  })
  @ApiResponse({ status: 404, description: 'Shopping list not found' })
  async update(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ValidationPipe()) dto: UpdateShoppingListDto,
  ): Promise<ShoppingListResponseDto> {
    const list = await this.shoppingListService.update(user.id, id, dto);
    return ShoppingListResponseDto.fromEntity(list);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a shopping list',
    description: 'Deletes a shopping list by ID. Only the owner can delete it.',
  })
  @ApiParam({
    name: 'id',
    description: 'Shopping list UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 204,
    description: 'Shopping list successfully deleted',
  })
  @ApiResponse({ status: 404, description: 'Shopping list not found' })
  async delete(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.shoppingListService.delete(user.id, id);
  }

  @Post(':listId/items')
  @ApiOperation({
    summary: 'Add items to a shopping list',
    description:
      'Adds one or more items to an existing shopping list. Only the owner can add items. New items are appended at the end by default.',
  })
  @ApiParam({
    name: 'listId',
    description: 'Shopping list UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 201,
    description: 'Items added, returns the updated shopping list',
    type: ShoppingListResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Shopping list not found' })
  async addItems(
    @CurrentUser() user: User,
    @Param('listId', new ParseUUIDPipe()) listId: string,
    @Body(new ValidationPipe()) dto: AddItemsToShoppingListDto,
  ): Promise<ShoppingListResponseDto> {
    const list = await this.shoppingListService.addItems(user.id, listId, dto);
    return ShoppingListResponseDto.fromEntity(list);
  }

  @Patch(':listId/items/:itemId')
  @ApiOperation({
    summary: 'Update a shopping list item',
    description:
      'Partially updates a single item in a shopping list. Only the owner can update items. Only provided fields are changed.',
  })
  @ApiParam({
    name: 'listId',
    description: 'Shopping list UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiParam({
    name: 'itemId',
    description: 'Shopping list item UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Item updated, returns the updated shopping list',
    type: ShoppingListResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Shopping list or item not found' })
  async updateItem(
    @CurrentUser() user: User,
    @Param('listId', new ParseUUIDPipe()) listId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body(new ValidationPipe()) dto: UpdateShoppingListItemDto,
  ): Promise<ShoppingListResponseDto> {
    const list = await this.shoppingListService.updateItem(
      user.id,
      listId,
      itemId,
      dto,
    );
    return ShoppingListResponseDto.fromEntity(list);
  }

  @Post(':listId/smart-group')
  @ApiOperation({
    summary: 'Smart group items by category',
    description:
      'Uses AI to analyze shopping list items and automatically assign the most appropriate category to each item. Sets groupedByCategories to true.',
  })
  @ApiParam({
    name: 'listId',
    description: 'Shopping list UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 200,
    description: 'Items categorized, returns the updated shopping list',
    type: ShoppingListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Shopping list not found' })
  @HttpCode(200)
  async smartGroup(
    @CurrentUser() user: User,
    @Param('listId', new ParseUUIDPipe()) listId: string,
  ): Promise<ShoppingListResponseDto> {
    const list = await this.shoppingListService.smartGroup(user.id, listId);
    return ShoppingListResponseDto.fromEntity(list);
  }

  @Delete(':listId/items/:itemId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Remove an item from a shopping list',
    description:
      'Removes a single item from a shopping list. Only the owner can remove items.',
  })
  @ApiParam({
    name: 'listId',
    description: 'Shopping list UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiParam({
    name: 'itemId',
    description: 'Shopping list item UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({ status: 204, description: 'Item removed' })
  @ApiResponse({ status: 404, description: 'Shopping list or item not found' })
  async removeItem(
    @CurrentUser() user: User,
    @Param('listId', new ParseUUIDPipe()) listId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
  ): Promise<void> {
    await this.shoppingListService.removeItem(user.id, listId, itemId);
  }
}
