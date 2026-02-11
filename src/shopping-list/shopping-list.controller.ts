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
  ApiHeader,
} from '@nestjs/swagger';
import { Paginate, Paginated } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { ShoppingListService } from './shopping-list.service';
import { CreateShoppingListDto } from './dto/create-shopping-list.dto';
import { UpdateShoppingListDto } from './dto/update-shopping-list.dto';
import { AddItemsToShoppingListDto } from './dto/add-items-to-shopping-list.dto';
import { UpdateShoppingListItemDto } from './dto/update-shopping-list-item.dto';
import { CombineShoppingListsDto } from './dto/combine-shopping-lists.dto';
import { ShoppingListResponseDto } from './dto/shopping-list-response.dto';
import { CurrentUser } from '../auth/decorators';
import { CurrentSpace } from '../spaces/decorators';
import { User } from '../entities/user.entity';
import { ShoppingList } from '../entities/shopping-list.entity';

@ApiTags('shopping-list')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Space-Id',
  required: false,
  description:
    'Space UUID. If provided, operates on shopping lists within that space. If omitted, operates on personal lists.',
  example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
})
@Controller('shopping-list')
export class ShoppingListController {
  constructor(private readonly shoppingListService: ShoppingListService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all shopping lists',
    description:
      'Returns paginated shopping lists belonging to the authenticated user (or space if X-Space-Id header is set), ordered by creation date (newest first). Supports cursor-based pagination via limit and cursor query params.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of shopping lists',
  })
  async findAll(
    @CurrentUser() user: User,
    @CurrentSpace() spaceId: string | null,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<ShoppingList>> {
    const result = await this.shoppingListService.findAllByUser(
      user.id,
      spaceId,
      query,
    );
    return {
      ...result,
      data: result.data.map((list) =>
        ShoppingListResponseDto.fromEntity(list),
      ) as unknown as ShoppingList[],
    };
  }

  @Post('combine')
  @ApiOperation({
    summary: 'Combine multiple shopping lists into one',
    description:
      'Merges items from multiple shopping lists into a new list. Items with the same name are combined with summed quantities. Original lists are kept unchanged.',
  })
  @ApiResponse({
    status: 201,
    description: 'Combined shopping list created',
    type: ShoppingListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error (less than 2 lists, invalid UUIDs)',
  })
  @ApiResponse({
    status: 404,
    description: 'One or more shopping lists not found',
  })
  async combine(
    @CurrentUser() user: User,
    @CurrentSpace() spaceId: string | null,
    @Body(new ValidationPipe()) dto: CombineShoppingListsDto,
  ): Promise<ShoppingListResponseDto> {
    const list = await this.shoppingListService.combineLists(
      user.id,
      dto,
      spaceId,
    );
    return ShoppingListResponseDto.fromEntity(list);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a shopping list by ID',
    description:
      'Returns a single shopping list by its UUID. Access is checked based on ownership or space membership.',
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
    @CurrentSpace() spaceId: string | null,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ShoppingListResponseDto> {
    const list = await this.shoppingListService.findOne(user.id, id, spaceId);
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
    @CurrentSpace() spaceId: string | null,
    @Body(new ValidationPipe()) dto: CreateShoppingListDto,
  ): Promise<ShoppingListResponseDto> {
    const list = await this.shoppingListService.create(user.id, dto, spaceId);
    return ShoppingListResponseDto.fromEntity(list);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a shopping list',
    description:
      'Updates a shopping list by ID. When items are provided, they fully replace existing items. Send version field for optimistic locking.',
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
  @ApiResponse({
    status: 409,
    description: 'Version conflict — list was modified by another user',
  })
  async update(
    @CurrentUser() user: User,
    @CurrentSpace() spaceId: string | null,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ValidationPipe()) dto: UpdateShoppingListDto,
  ): Promise<ShoppingListResponseDto> {
    const list = await this.shoppingListService.update(
      user.id,
      id,
      dto,
      spaceId,
    );
    return ShoppingListResponseDto.fromEntity(list);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a shopping list',
    description:
      'Deletes a shopping list by ID. Only the owner can delete personal lists. Any space member can delete space lists.',
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
    @CurrentSpace() spaceId: string | null,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.shoppingListService.delete(user.id, id, spaceId);
  }

  @Post(':listId/items')
  @ApiOperation({
    summary: 'Add items to a shopping list',
    description:
      'Adds one or more items to an existing shopping list. New items are appended at the end by default.',
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
    @CurrentSpace() spaceId: string | null,
    @Param('listId', new ParseUUIDPipe()) listId: string,
    @Body(new ValidationPipe()) dto: AddItemsToShoppingListDto,
  ): Promise<ShoppingListResponseDto> {
    const list = await this.shoppingListService.addItems(
      user.id,
      listId,
      dto,
      spaceId,
    );
    return ShoppingListResponseDto.fromEntity(list);
  }

  @Patch(':listId/items/:itemId')
  @ApiOperation({
    summary: 'Update a shopping list item',
    description:
      'Partially updates a single item in a shopping list. Only provided fields are changed.',
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
    @CurrentSpace() spaceId: string | null,
    @Param('listId', new ParseUUIDPipe()) listId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body(new ValidationPipe()) dto: UpdateShoppingListItemDto,
  ): Promise<ShoppingListResponseDto> {
    const list = await this.shoppingListService.updateItem(
      user.id,
      listId,
      itemId,
      dto,
      spaceId,
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
    @CurrentSpace() spaceId: string | null,
    @Param('listId', new ParseUUIDPipe()) listId: string,
  ): Promise<ShoppingListResponseDto> {
    const list = await this.shoppingListService.smartGroup(
      user.id,
      listId,
      spaceId,
    );
    return ShoppingListResponseDto.fromEntity(list);
  }

  @Delete(':listId/items/:itemId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Remove an item from a shopping list',
    description: 'Removes a single item from a shopping list.',
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
    @CurrentSpace() spaceId: string | null,
    @Param('listId', new ParseUUIDPipe()) listId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
  ): Promise<void> {
    await this.shoppingListService.removeItem(user.id, listId, itemId, spaceId);
  }
}
