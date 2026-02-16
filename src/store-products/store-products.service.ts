import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Store } from '../entities/store.entity';
import { StoreCategory } from '../entities/store-category.entity';
import { StoreProduct } from '../entities/store-product.entity';
import { Category } from '../entities/category.entity';
import { CsvParserService, ParsedCsvRow } from './csv-parser.service';
import { UploadCsvResponseDto } from './dto/upload-csv-response.dto';
import { resolveSystemCategorySlug } from './category-mapping';

@Injectable()
export class StoreProductsService {
  private readonly logger = new Logger(StoreProductsService.name);

  constructor(
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(StoreCategory)
    private readonly storeCategoryRepo: Repository<StoreCategory>,
    @InjectRepository(StoreProduct)
    private readonly storeProductRepo: Repository<StoreProduct>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly csvParser: CsvParserService,
  ) {}

  async uploadCsv(
    storeSlug: string,
    buffer: Buffer,
  ): Promise<UploadCsvResponseDto> {
    const startTime = Date.now();

    const store = await this.storeRepo.findOne({
      where: { slug: storeSlug, isActive: true },
    });
    if (!store) {
      throw new NotFoundException(`Store "${storeSlug}" not found`);
    }

    const { rows, errors } = this.csvParser.parse(buffer);

    if (rows.length === 0) {
      return {
        created: 0,
        updated: 0,
        errors,
        durationMs: Date.now() - startTime,
      };
    }

    const categoryMap = await this.upsertCategories(store.id, rows);

    const { created, updated, productErrors } = await this.upsertProducts(
      store.id,
      rows,
      categoryMap,
    );
    errors.push(...productErrors);

    this.logger.log(
      { store: storeSlug, created, updated, errors: errors.length },
      'CSV upload completed',
    );

    return {
      created,
      updated,
      errors,
      durationMs: Date.now() - startTime,
    };
  }

  private async upsertCategories(
    storeId: string,
    rows: ParsedCsvRow[],
  ): Promise<Map<string, string>> {
    const uniqueCategories = [...new Set(rows.map((r) => r.category))];
    const categoryMap = new Map<string, string>(); // categoryName -> storeCategoryId

    // Load all system categories once
    const systemCategories = await this.categoryRepo.find({
      where: { userId: IsNull() },
    });
    const systemCatBySlug = new Map(
      systemCategories.map((c) => [c.slug, c.id]),
    );

    for (const categoryName of uniqueCategories) {
      const slug = this.slugify(categoryName);

      // Resolve system category
      const systemSlug = resolveSystemCategorySlug(categoryName);
      const categoryId = systemSlug
        ? (systemCatBySlug.get(systemSlug) ?? null)
        : null;

      const existing = await this.storeCategoryRepo.findOne({
        where: { storeId, slug },
      });

      if (existing) {
        if (existing.categoryId !== categoryId) {
          await this.storeCategoryRepo.update(existing.id, { categoryId });
        }
        categoryMap.set(categoryName, existing.id);
      } else {
        const created = this.storeCategoryRepo.create({
          storeId,
          name: categoryName,
          slug,
          categoryId,
        });
        const saved = await this.storeCategoryRepo.save(created);
        categoryMap.set(categoryName, saved.id);
      }
    }

    return categoryMap;
  }

  private async upsertProducts(
    storeId: string,
    rows: ParsedCsvRow[],
    categoryMap: Map<string, string>,
  ): Promise<{ created: number; updated: number; productErrors: string[] }> {
    const productErrors: string[] = [];
    const now = new Date();
    const BATCH_SIZE = 500;

    // Count existing products before upsert
    const existingCount = await this.storeProductRepo.count({
      where: { storeId },
    });

    // Deduplicate by externalSlug (last occurrence wins)
    const slugToEntity = new Map<
      string,
      {
        storeId: string;
        externalSlug: string;
        name: string;
        price: number;
        oldPrice: number | null;
        quantity: number | null;
        unit: string;
        storeCategoryId: string | null;
        inStock: boolean;
        lastScrapedAt: Date;
      }
    >();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const externalSlug = this.slugify(row.name);

      if (!externalSlug) {
        productErrors.push(`Row ${i + 2}: empty slug for "${row.name}"`);
        continue;
      }

      slugToEntity.set(externalSlug, {
        storeId,
        externalSlug,
        name: row.name,
        price: row.price,
        oldPrice: row.oldPrice,
        quantity: row.quantity,
        unit: row.unit,
        storeCategoryId: categoryMap.get(row.category) ?? null,
        inStock: true,
        lastScrapedAt: now,
      });
    }

    const entities = [...slugToEntity.values()];

    // Batch upsert
    for (let i = 0; i < entities.length; i += BATCH_SIZE) {
      const batch = entities.slice(i, i + BATCH_SIZE);
      try {
        await this.storeProductRepo.upsert(batch, {
          conflictPaths: ['storeId', 'externalSlug'],
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        productErrors.push(
          `Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${message}`,
        );
      }
    }

    // Mark products not in this upload as out of stock
    await this.storeProductRepo
      .createQueryBuilder()
      .update()
      .set({ inStock: false })
      .where('storeId = :storeId', { storeId })
      .andWhere('lastScrapedAt < :now', { now })
      .execute();

    // Count after upsert to determine created vs updated
    const newCount = await this.storeProductRepo.count({
      where: { storeId },
    });
    const created = newCount - existingCount;
    const updated = entities.length - created;

    return { created, updated, productErrors };
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-zа-яіїєґ0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 200);
  }
}
