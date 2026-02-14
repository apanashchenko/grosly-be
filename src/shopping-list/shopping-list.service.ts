import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  In,
  IsNull,
  Repository,
  OptimisticLockVersionMismatchError,
} from 'typeorm';
import {
  paginate,
  Paginated,
  PaginateQuery,
  PaginationType,
} from 'nestjs-paginate';
import Redis from 'ioredis';
import { ShoppingList } from '../entities/shopping-list.entity';
import { ShoppingListItem } from '../entities/shopping-list-item.entity';
import { CreateShoppingListDto } from './dto/create-shopping-list.dto';
import { UpdateShoppingListDto } from './dto/update-shopping-list.dto';
import { AddItemsToShoppingListDto } from './dto/add-items-to-shopping-list.dto';
import { UpdateShoppingListItemDto } from './dto/update-shopping-list-item.dto';
import { CombineShoppingListsDto } from './dto/combine-shopping-lists.dto';
import { AiService } from '../ai/ai.service';
import { CategoriesService } from '../categories/categories.service';
import { REDIS_CLIENT } from '../cache/cache.module';

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
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async create(
    userId: string,
    dto: CreateShoppingListDto,
    spaceId: string | null = null,
  ): Promise<ShoppingList> {
    const name =
      dto.name || `Shopping list ${new Date().toISOString().split('T')[0]}`;

    const list = this.shoppingListRepo.create({
      name,
      userId,
      spaceId,
      groupedByCategories: dto.groupedByCategories ?? false,
      isPinned: dto.isPinned ?? false,
      label: dto.label ?? null,
      items: dto.items.map((item, index) =>
        this.itemRepo.create({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          note: item.note ?? null,
          purchased: item.purchased ?? false,
          categoryId: item.categoryId ?? null,
          position: index,
          createdByUserId: userId,
        }),
      ),
    });

    const saved = await this.shoppingListRepo.save(list);

    this.logger.log(
      {
        id: saved.id,
        name: saved.name,
        itemsCount: saved.items.length,
        spaceId,
      },
      'Shopping list created',
    );

    return this.findOne(userId, saved.id, spaceId);
  }

  async findAllByUser(
    userId: string,
    spaceId: string | null = null,
    query: PaginateQuery,
  ): Promise<Paginated<ShoppingList>> {
    return paginate(query, this.shoppingListRepo, {
      sortableColumns: ['createdAt', 'id'],
      defaultSortBy: [['createdAt', 'DESC']],
      searchableColumns: ['name'],
      paginationType: PaginationType.CURSOR,
      loadEagerRelations: true,
      relations: ['items', 'items.category', 'items.createdBy'],
      where: spaceId ? { spaceId } : { userId, spaceId: IsNull() },
    });
  }

  async findOne(
    userId: string,
    id: string,
    spaceId: string | null = null,
  ): Promise<ShoppingList> {
    const list = await this.shoppingListRepo.findOne({
      where: { id },
      relations: { items: { createdBy: true } },
    });

    if (!list) {
      throw new NotFoundException(`Shopping list ${id} not found`);
    }

    if (spaceId) {
      if (list.spaceId !== spaceId) {
        throw new ForbiddenException();
      }
    } else {
      if (list.userId !== userId || list.spaceId !== null) {
        throw new ForbiddenException();
      }
    }

    return list;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateShoppingListDto,
    spaceId: string | null = null,
  ): Promise<ShoppingList> {
    const list = await this.findOne(userId, id, spaceId);

    if (dto.version !== undefined) {
      this.checkVersion(list, dto.version);
    }

    if (dto.name !== undefined) {
      list.name = dto.name;
    }

    if (dto.groupedByCategories !== undefined) {
      list.groupedByCategories = dto.groupedByCategories;
    }

    if (dto.isPinned !== undefined) {
      list.isPinned = dto.isPinned;
    }

    if (dto.label !== undefined) {
      list.label = dto.label;
    }

    if (dto.items !== undefined) {
      // Remove old items and replace with new ones
      await this.itemRepo.delete({ shoppingList: { id: list.id } });

      list.items = dto.items.map((item, index) =>
        this.itemRepo.create({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          note: item.note ?? null,
          purchased: item.purchased ?? false,
          position: index,
          createdByUserId: userId,
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

    const saved = await this.saveWithOptimisticLock(list);

    this.logger.log(
      { id: saved.id, itemsCount: saved.items.length },
      'Shopping list updated',
    );

    return this.findOne(userId, saved.id, spaceId);
  }

  async delete(
    userId: string,
    id: string,
    spaceId: string | null = null,
  ): Promise<void> {
    const list = await this.findOne(userId, id, spaceId);
    await this.shoppingListRepo.remove(list);

    this.logger.log({ id }, 'Shopping list deleted');
  }

  async addItems(
    userId: string,
    listId: string,
    dto: AddItemsToShoppingListDto,
    spaceId: string | null = null,
  ): Promise<ShoppingList> {
    const list = await this.findOne(userId, listId, spaceId);

    const maxPosition =
      list.items.length > 0
        ? Math.max(...list.items.map((item) => item.position))
        : -1;

    const newItems = dto.items.map((item, index) =>
      this.itemRepo.create({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        note: item.note ?? null,
        purchased: item.purchased ?? false,
        categoryId: item.categoryId ?? null,
        position: maxPosition + 1 + index,
        createdByUserId: userId,
      }),
    );

    list.items.push(...newItems);
    await this.shoppingListRepo.save(list);

    this.logger.log(
      { listId: list.id, addedCount: newItems.length },
      'Items added to shopping list',
    );

    return this.findOne(userId, listId, spaceId);
  }

  async updateItem(
    userId: string,
    listId: string,
    itemId: string,
    dto: UpdateShoppingListItemDto,
    spaceId: string | null = null,
  ): Promise<ShoppingList> {
    const list = await this.findOne(userId, listId, spaceId);
    const item = this.findItemInList(list, itemId);

    if (dto.name !== undefined) item.name = dto.name;
    if (dto.quantity !== undefined) item.quantity = dto.quantity;
    if (dto.unit !== undefined) item.unit = dto.unit;
    if (dto.note !== undefined) item.note = dto.note;
    if (dto.purchased !== undefined) item.purchased = dto.purchased;
    if (dto.categoryId !== undefined) item.categoryId = dto.categoryId;
    if (dto.position !== undefined) item.position = dto.position;

    await this.itemRepo.save(item);

    // Bump version on the list
    await this.shoppingListRepo.save(list);

    this.logger.log(
      { listId: list.id, itemId: item.id },
      'Shopping list item updated',
    );

    return this.findOne(userId, listId, spaceId);
  }

  async removeItem(
    userId: string,
    listId: string,
    itemId: string,
    spaceId: string | null = null,
  ): Promise<void> {
    const list = await this.findOne(userId, listId, spaceId);
    const item = this.findItemInList(list, itemId);

    await this.itemRepo.remove(item);

    // Bump version on the list
    await this.shoppingListRepo.save(list);

    this.logger.log({ listId: list.id, itemId }, 'Shopping list item removed');
  }

  async smartGroup(
    userId: string,
    listId: string,
    spaceId: string | null = null,
  ): Promise<ShoppingList> {
    const lockKey = `smart-group-lock:${listId}`;
    const locked = await this.redis.set(lockKey, '1', 'EX', 60, 'NX');

    if (!locked) {
      throw new ConflictException(
        'Smart grouping is already in progress for this list',
      );
    }

    try {
      const list = await this.findOne(userId, listId, spaceId);

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

      const uncategorizedItems = list.items.filter(
        (item) => item.categoryId === null,
      );

      if (uncategorizedItems.length === 0) {
        await this.shoppingListRepo.update(listId, {
          groupedByCategories: true,
        });

        this.logger.log(
          { listId, itemsGrouped: 0 },
          'All items already categorized, skipping AI call',
        );

        return this.findOne(userId, listId, spaceId);
      }

      const itemsForAi = uncategorizedItems.map((item) => ({
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
        const item = uncategorizedItems.find((i) => i.id === mapping.itemId);
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

      await this.itemRepo.save(uncategorizedItems);

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
        {
          listId,
          totalItems: list.items.length,
          itemsGrouped: uncategorizedItems.length,
          alreadyCategorized: list.items.length - uncategorizedItems.length,
        },
        'Shopping list smart grouped',
      );

      return this.findOne(userId, listId, spaceId);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async combineLists(
    userId: string,
    dto: CombineShoppingListsDto,
    spaceId: string | null = null,
  ): Promise<ShoppingList> {
    const whereCondition = spaceId
      ? { id: In(dto.listIds), spaceId }
      : { id: In(dto.listIds), userId };

    const lists = await this.shoppingListRepo.find({
      where: whereCondition,
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

    const list = await this.create(
      userId,
      {
        name: dto.name,
        items: mergedItems,
        groupedByCategories: dto.groupedByCategories,
      },
      spaceId,
    );

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

  private checkVersion(list: ShoppingList, expectedVersion: number): void {
    if (list.version !== expectedVersion) {
      throw new ConflictException(
        'Shopping list was modified by another user. Please refresh and try again.',
      );
    }
  }

  private async saveWithOptimisticLock(
    list: ShoppingList,
  ): Promise<ShoppingList> {
    try {
      return await this.shoppingListRepo.save(list);
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException(
          'Shopping list was modified by another user. Please refresh and try again.',
        );
      }
      throw error;
    }
  }
}
