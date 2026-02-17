import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ShoppingList } from '../entities/shopping-list.entity';
import { ShoppingListItem } from '../entities/shopping-list-item.entity';
import { ActivityPeriod } from './dto/analytics-query.dto';
import {
  TopProductItemDto,
  CategoryDistributionItemDto,
  ActivityItemDto,
  AnalyticsOverviewResponseDto,
} from './dto/analytics-response.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectPinoLogger(AnalyticsService.name)
    private readonly logger: PinoLogger,
    @InjectRepository(ShoppingList)
    private readonly shoppingListRepo: Repository<ShoppingList>,
    @InjectRepository(ShoppingListItem)
    private readonly itemRepo: Repository<ShoppingListItem>,
  ) {}

  async getOverview(
    userId: string,
    spaceId: string | null,
    topProductsLimit: number,
    period: ActivityPeriod,
  ): Promise<AnalyticsOverviewResponseDto> {
    const startDate = this.getStartDate(period);

    const [topProducts, categoriesDistribution, activity] = await Promise.all([
      this.getTopProducts(userId, spaceId, topProductsLimit, startDate),
      this.getCategoriesDistribution(userId, spaceId, startDate),
      this.getActivity(userId, spaceId, period, startDate),
    ]);

    this.logger.debug(
      { userId, spaceId, topProductsLimit, period },
      'Analytics overview fetched',
    );

    return { topProducts, categoriesDistribution, activity };
  }

  private async getTopProducts(
    userId: string,
    spaceId: string | null,
    limit: number,
    startDate: Date,
  ): Promise<TopProductItemDto[]> {
    const qb = this.itemRepo
      .createQueryBuilder('item')
      .innerJoin('item.shoppingList', 'list')
      .select('LOWER(TRIM(item.name))', 'name')
      .addSelect('COUNT(*)::int', 'count');

    this.applyScope(qb, userId, spaceId);
    qb.andWhere('list.createdAt >= :startDate', { startDate });

    return qb
      .groupBy('LOWER(TRIM(item.name))')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  private async getCategoriesDistribution(
    userId: string,
    spaceId: string | null,
    startDate: Date,
  ): Promise<CategoryDistributionItemDto[]> {
    const qb = this.itemRepo
      .createQueryBuilder('item')
      .innerJoin('item.shoppingList', 'list')
      .leftJoin('item.category', 'category')
      .select('item.categoryId', 'categoryId')
      .addSelect("COALESCE(category.name, 'Uncategorized')", 'categoryName')
      .addSelect('category.slug', 'slug')
      .addSelect('category.icon', 'icon')
      .addSelect('COUNT(*)::int', 'count');

    this.applyScope(qb, userId, spaceId);
    qb.andWhere('list.createdAt >= :startDate', { startDate });

    return qb
      .groupBy('item.categoryId')
      .addGroupBy('category.name')
      .addGroupBy('category.slug')
      .addGroupBy('category.icon')
      .orderBy('count', 'DESC')
      .getRawMany();
  }

  private async getActivity(
    userId: string,
    spaceId: string | null,
    period: ActivityPeriod,
    startDate: Date,
  ): Promise<ActivityItemDto[]> {
    const dateExpr = "TO_CHAR(list.createdAt, 'YYYY-MM-DD')";

    const qb = this.shoppingListRepo
      .createQueryBuilder('list')
      .select(dateExpr, 'date')
      .addSelect('COUNT(*)::int', 'count');

    this.applyScope(qb, userId, spaceId);
    qb.andWhere('list.createdAt >= :startDate', { startDate });

    const results = await qb
      .groupBy(dateExpr)
      .orderBy('date', 'ASC')
      .getRawMany();

    return period === 'week'
      ? this.fillMissingDays(results)
      : this.fillMissingDaysInMonth(results);
  }

  private getStartDate(period: ActivityPeriod): Date {
    const now = new Date();
    if (period === 'week') {
      const start = new Date(now);
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private applyScope(
    qb: { where: Function; andWhere: Function },
    userId: string,
    spaceId: string | null,
  ): void {
    if (spaceId) {
      qb.where('list.spaceId = :spaceId', { spaceId });
    } else {
      qb.where('list.userId = :userId AND list.spaceId IS NULL', { userId });
    }
  }

  private fillMissingDays(results: ActivityItemDto[]): ActivityItemDto[] {
    const resultMap = new Map(results.map((r) => [r.date, r.count]));
    const filled: ActivityItemDto[] = [];
    const now = new Date();

    const monday = new Date(now);
    const day = monday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      const key = this.toDateString(d);
      filled.push({ date: key, count: resultMap.get(key) ?? 0 });
    }

    return filled;
  }

  private fillMissingDaysInMonth(results: ActivityItemDto[]): ActivityItemDto[] {
    const resultMap = new Map(results.map((r) => [r.date, r.count]));
    const filled: ActivityItemDto[] = [];
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), i);
      const key = this.toDateString(d);
      filled.push({ date: key, count: resultMap.get(key) ?? 0 });
    }

    return filled;
  }

  private toDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
