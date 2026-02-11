import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async findAll(userId: string): Promise<Category[]> {
    return this.categoryRepo.find({
      where: [{ userId: IsNull() }, { userId }],
      order: { name: 'ASC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Category> {
    const category = await this.categoryRepo.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    if (category.userId !== null && category.userId !== userId) {
      throw new ForbiddenException();
    }

    return category;
  }

  async create(userId: string, dto: CreateCategoryDto): Promise<Category> {
    const slug = this.generateSlug(dto.name);

    const existing = await this.categoryRepo.findOne({
      where: { slug, userId },
    });
    if (existing) {
      throw new ConflictException(`Category "${dto.name}" already exists`);
    }

    const category = this.categoryRepo.create({
      name: dto.name,
      slug,
      icon: dto.icon ?? null,
      userId,
    });

    const saved = await this.categoryRepo.save(category);

    this.logger.log(
      { id: saved.id, name: saved.name },
      'Custom category created',
    );

    return saved;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(userId, id);

    if (category.userId === null) {
      throw new ForbiddenException('Cannot modify system categories');
    }

    if (dto.name !== undefined) {
      category.name = dto.name;
      category.slug = this.generateSlug(dto.name);
    }

    if (dto.icon !== undefined) {
      category.icon = dto.icon;
    }

    const saved = await this.categoryRepo.save(category);

    this.logger.log({ id: saved.id }, 'Custom category updated');

    return saved;
  }

  async delete(userId: string, id: string): Promise<void> {
    const category = await this.findOne(userId, id);

    if (category.userId === null) {
      throw new ForbiddenException('Cannot delete system categories');
    }

    await this.categoryRepo.remove(category);

    this.logger.log({ id }, 'Custom category deleted');
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zа-яіїєґ0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
