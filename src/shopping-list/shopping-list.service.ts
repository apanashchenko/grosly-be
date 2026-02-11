import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ShoppingList } from '../entities/shopping-list.entity';
import { ShoppingListItem } from '../entities/shopping-list-item.entity';
import { CreateShoppingListDto } from './dto/create-shopping-list.dto';
import { UpdateShoppingListDto } from './dto/update-shopping-list.dto';
import { AddItemsToShoppingListDto } from './dto/add-items-to-shopping-list.dto';
import { UpdateShoppingListItemDto } from './dto/update-shopping-list-item.dto';
import { CombineShoppingListsDto } from './dto/combine-shopping-lists.dto';
import { AiService } from '../ai/ai.service';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class ShoppingListService {
  private readonly logger = new Logger(ShoppingListService.name);

  constructor(
    @InjectRepository(ShoppingList)
    private readonly shoppingListRepo: Repository<ShoppingList>,
    @InjectRepository(ShoppingListItem)
    private readonly itemRepo: Repository<ShoppingListItem>,
    private readonly aiService: AiService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(
    userId: string,
    dto: CreateShoppingListDto,
  ): Promise<ShoppingList> {
    const name =
      dto.name || `Shopping list ${new Date().toISOString().split('T')[0]}`;

    const list = this.shoppingListRepo.create({
      name,
      userId,
      groupedByCategories: dto.groupedByCategories ?? false,
      items: dto.items.map((item, index) =>
        this.itemRepo.create({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          purchased: item.purchased ?? false,
          categoryId: item.categoryId ?? null,
          position: index,
        }),
      ),
    });

    const saved = await this.shoppingListRepo.save(list);

    this.logger.log(
      { id: saved.id, name: saved.name, itemsCount: saved.items.length },
      'Shopping list created',
    );

    return saved;
  }

  async findAllByUser(userId: string): Promise<ShoppingList[]> {
    return this.shoppingListRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<ShoppingList> {
    const list = await this.shoppingListRepo.findOne({ where: { id } });

    if (!list) {
      throw new NotFoundException(`Shopping list ${id} not found`);
    }

    if (list.userId !== userId) {
      throw new ForbiddenException();
    }

    return list;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateShoppingListDto,
  ): Promise<ShoppingList> {
    const list = await this.findOne(userId, id);

    if (dto.name !== undefined) {
      list.name = dto.name;
    }

    if (dto.groupedByCategories !== undefined) {
      list.groupedByCategories = dto.groupedByCategories;
    }

    if (dto.items !== undefined) {
      // Remove old items and replace with new ones
      await this.itemRepo.delete({ shoppingList: { id: list.id } });

      list.items = dto.items.map((item, index) =>
        this.itemRepo.create({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          purchased: item.purchased ?? false,
          position: index,
        }),
      );
    }

    if (dto.itemPositions !== undefined) {
      for (const pos of dto.itemPositions) {
        const item = this.findItemInList(list, pos.id);
        item.position = pos.position;
      }
      await this.itemRepo.save(list.items);
    }

    const saved = await this.shoppingListRepo.save(list);

    this.logger.log(
      { id: saved.id, itemsCount: saved.items.length },
      'Shopping list updated',
    );

    return saved;
  }

  async delete(userId: string, id: string): Promise<void> {
    const list = await this.findOne(userId, id);
    await this.shoppingListRepo.remove(list);

    this.logger.log({ id }, 'Shopping list deleted');
  }

  async addItems(
    userId: string,
    listId: string,
    dto: AddItemsToShoppingListDto,
  ): Promise<ShoppingList> {
    const list = await this.findOne(userId, listId);

    const maxPosition =
      list.items.length > 0
        ? Math.max(...list.items.map((item) => item.position))
        : -1;

    const newItems = dto.items.map((item, index) =>
      this.itemRepo.create({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        purchased: item.purchased ?? false,
        categoryId: item.categoryId ?? null,
        position: maxPosition + 1 + index,
        shoppingList: { id: list.id },
      }),
    );

    await this.itemRepo.save(newItems);

    this.logger.log(
      { listId: list.id, addedCount: newItems.length },
      'Items added to shopping list',
    );

    return this.findOne(userId, listId);
  }

  async updateItem(
    userId: string,
    listId: string,
    itemId: string,
    dto: UpdateShoppingListItemDto,
  ): Promise<ShoppingList> {
    const list = await this.findOne(userId, listId);
    const item = this.findItemInList(list, itemId);

    if (dto.name !== undefined) item.name = dto.name;
    if (dto.quantity !== undefined) item.quantity = dto.quantity;
    if (dto.unit !== undefined) item.unit = dto.unit;
    if (dto.purchased !== undefined) item.purchased = dto.purchased;
    if (dto.categoryId !== undefined) item.categoryId = dto.categoryId;
    if (dto.position !== undefined) item.position = dto.position;

    await this.itemRepo.save(item);

    this.logger.log(
      { listId: list.id, itemId: item.id },
      'Shopping list item updated',
    );

    return this.findOne(userId, listId);
  }

  async removeItem(
    userId: string,
    listId: string,
    itemId: string,
  ): Promise<void> {
    const list = await this.findOne(userId, listId);
    const item = this.findItemInList(list, itemId);

    await this.itemRepo.remove(item);

    this.logger.log({ listId: list.id, itemId }, 'Shopping list item removed');
  }

  async smartGroup(userId: string, listId: string): Promise<ShoppingList> {
    const list = await this.findOne(userId, listId);

    if (list.items.length === 0) {
      return list;
    }

    const categories = await this.categoriesService.findAll(userId);

    if (categories.length === 0) {
      this.logger.warn(
        { listId },
        'No categories available for smart grouping',
      );
      return list;
    }

    const itemsForAi = list.items.map((item) => ({
      id: item.id,
      name: item.name,
    }));

    const categoriesForAi = categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
    }));

    const mappings = await this.aiService.categorizeItems(
      itemsForAi,
      categoriesForAi,
    );

    const categoryIds = new Set(categories.map((c) => c.id));

    const categoriesMap = new Map(categories.map((c) => [c.id, c]));
    let lowConfidenceCount = 0;

    for (const mapping of mappings) {
      const item = list.items.find((i) => i.id === mapping.itemId);
      if (!item) continue;

      if (mapping.confidence < 0.6) {
        lowConfidenceCount++;
        item.categoryId = null;
        item.category = null;
      } else if (
        mapping.categoryId === null ||
        categoryIds.has(mapping.categoryId)
      ) {
        item.categoryId = mapping.categoryId;
        item.category = mapping.categoryId
          ? (categoriesMap.get(mapping.categoryId) ?? null)
          : null;
      }
    }

    await this.itemRepo.save(list.items);

    if (lowConfidenceCount > 0) {
      this.logger.warn(
        { listId, lowConfidenceCount },
        'Some items had low confidence and were left uncategorized',
      );
    }

    await this.shoppingListRepo.update(listId, {
      groupedByCategories: true,
    });

    this.logger.log(
      { listId, itemsGrouped: mappings.length },
      'Shopping list smart grouped',
    );

    return this.findOne(userId, listId);
  }

  async combineLists(
    userId: string,
    dto: CombineShoppingListsDto,
  ): Promise<ShoppingList> {
    const lists = await this.shoppingListRepo.find({
      where: { id: In(dto.listIds), userId },
    });

    if (lists.length !== dto.listIds.length) {
      const foundIds = new Set(lists.map((l) => l.id));
      const missingIds = dto.listIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Shopping lists not found: ${missingIds.join(', ')}`,
      );
    }

    const allItems = lists.flatMap((list) => list.items);

    const grouped = new Map<
      string,
      { quantity: number; unit: string; categoryId: string | null }
    >();

    for (const item of allItems) {
      const key = `${item.name.toLowerCase().trim()}::${item.unit.toLowerCase().trim()}`;
      const existing = grouped.get(key);
      const qty = Number(item.quantity);

      if (existing) {
        existing.quantity += qty;
        if (!existing.categoryId && item.categoryId) {
          existing.categoryId = item.categoryId;
        }
      } else {
        grouped.set(key, {
          quantity: qty,
          unit: item.unit,
          categoryId: item.categoryId,
        });
      }
    }

    const mergedItems = Array.from(grouped.entries()).map(([key, data]) => ({
      name: key.split('::')[0],
      quantity: data.quantity,
      unit: data.unit,
      categoryId: data.categoryId ?? undefined,
    }));

    const list = await this.create(userId, {
      name: dto.name,
      items: mergedItems,
      groupedByCategories: dto.groupedByCategories,
    });

    this.logger.log(
      {
        id: list.id,
        sourceListIds: dto.listIds,
        totalItems: allItems.length,
        mergedItems: mergedItems.length,
      },
      'Shopping lists combined',
    );

    return list;
  }

  private findItemInList(list: ShoppingList, itemId: string): ShoppingListItem {
    const item = list.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException(
        `Item ${itemId} not found in shopping list ${list.id}`,
      );
    }
    return item;
  }
}
