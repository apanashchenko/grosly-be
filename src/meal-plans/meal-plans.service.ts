import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, Paginated, PaginationType } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { MealPlan } from '../entities/meal-plan.entity';
import { MealPlanRecipe } from '../entities/meal-plan-recipe.entity';
import { Recipe } from '../entities/recipe.entity';
import { RecipesService } from '../recipes/recipes.service';
import { CreateMealPlanDto } from './dto/create-meal-plan.dto';
import {
  UpdateMealPlanDto,
  UpdateMealPlanRecipeDto,
} from './dto/update-meal-plan.dto';
import { MealPlanResponseDto } from './dto/meal-plan-response.dto';

@Injectable()
export class MealPlansService {
  constructor(
    @InjectPinoLogger(MealPlansService.name)
    private readonly logger: PinoLogger,
    @InjectRepository(MealPlan)
    private readonly mealPlanRepo: Repository<MealPlan>,
    @InjectRepository(MealPlanRecipe)
    private readonly mealPlanRecipeRepo: Repository<MealPlanRecipe>,
    @InjectRepository(Recipe)
    private readonly recipeRepo: Repository<Recipe>,
    private readonly recipesService: RecipesService,
  ) {}

  async create(
    userId: string,
    dto: CreateMealPlanDto,
  ): Promise<MealPlanResponseDto> {
    const name =
      dto.name || `Meal plan ${new Date().toISOString().split('T')[0]}`;

    const mealPlan = this.mealPlanRepo.create({
      name,
      description: dto.description ?? null,
      numberOfDays: dto.numberOfDays ?? 1,
      numberOfPeople: dto.numberOfPeople ?? 1,
      originalInput: dto.originalInput ?? null,
      userId,
    });

    const saved = await this.mealPlanRepo.save(mealPlan);

    if (dto.recipes?.length) {
      const recipeLinks: { recipeId: string; dayNumber: number }[] = [];
      for (const recipeDto of dto.recipes) {
        const savedRecipe = await this.recipesService.saveRecipe(
          userId,
          recipeDto,
        );
        recipeLinks.push({
          recipeId: savedRecipe.id,
          dayNumber: recipeDto.dayNumber ?? 1,
        });
      }
      await this.linkRecipes(saved.id, recipeLinks);
    }

    this.logger.info({ id: saved.id, name: saved.name }, 'Meal plan created');

    const result = await this.findOneEntity(userId, saved.id);
    return MealPlanResponseDto.fromEntity(result);
  }

  async findAllByUser(
    userId: string,
    query: PaginateQuery,
  ): Promise<Paginated<MealPlan>> {
    return paginate(query, this.mealPlanRepo, {
      sortableColumns: ['createdAt', 'id'],
      defaultSortBy: [['createdAt', 'DESC']],
      paginationType: PaginationType.CURSOR,
      loadEagerRelations: true,
      relations: ['mealPlanRecipes', 'mealPlanRecipes.recipe'],
      where: { userId },
    });
  }

  async findOne(userId: string, id: string): Promise<MealPlanResponseDto> {
    const mealPlan = await this.findOneEntity(userId, id);
    return MealPlanResponseDto.fromEntity(mealPlan);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateMealPlanDto,
  ): Promise<MealPlanResponseDto> {
    const mealPlan = await this.findOneEntity(userId, id);

    if (
      dto.numberOfDays !== undefined &&
      dto.numberOfDays < mealPlan.numberOfDays
    ) {
      const newDays = dto.numberOfDays;
      const recipesOnHigherDays = mealPlan.mealPlanRecipes?.filter(
        (r) => r.dayNumber > newDays,
      );

      if (recipesOnHigherDays?.length) {
        const days = [
          ...new Set(recipesOnHigherDays.map((r) => r.dayNumber)),
        ].sort();
        throw new BadRequestException(
          `Cannot reduce numberOfDays to ${newDays}: there are recipes assigned to day(s) ${days.join(', ')}. Reassign or remove them first.`,
        );
      }
    }

    const updateData: Partial<MealPlan> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.numberOfDays !== undefined)
      updateData.numberOfDays = dto.numberOfDays;
    if (dto.numberOfPeople !== undefined)
      updateData.numberOfPeople = dto.numberOfPeople;
    if (Object.keys(updateData).length > 0) {
      await this.mealPlanRepo.update(id, updateData);
    }

    if (dto.recipes !== undefined) {
      await this.replaceRecipes(userId, mealPlan, dto.recipes);
    }

    this.logger.info({ id }, 'Meal plan updated');

    const result = await this.findOneEntity(userId, id);
    return MealPlanResponseDto.fromEntity(result);
  }

  async delete(userId: string, id: string): Promise<void> {
    const mealPlan = await this.findOneEntity(userId, id);
    await this.mealPlanRepo.remove(mealPlan);

    this.logger.info({ id }, 'Meal plan deleted');
  }

  private async replaceRecipes(
    userId: string,
    mealPlan: MealPlan,
    recipeDtos: UpdateMealPlanRecipeDto[],
  ): Promise<void> {
    // Verify all recipes exist and belong to the user
    for (const dto of recipeDtos) {
      const recipe = await this.recipeRepo.findOne({
        where: { id: dto.recipeId },
      });

      if (!recipe) {
        throw new NotFoundException(`Recipe ${dto.recipeId} not found`);
      }

      if (recipe.userId !== userId) {
        throw new ForbiddenException(
          `Recipe ${dto.recipeId} does not belong to you`,
        );
      }
    }

    // Delete existing join records
    await this.mealPlanRecipeRepo.delete({ mealPlanId: mealPlan.id });

    await this.linkRecipes(
      mealPlan.id,
      recipeDtos.map((d) => ({
        recipeId: d.recipeId,
        dayNumber: d.dayNumber ?? 1,
      })),
    );
  }

  private async linkRecipes(
    mealPlanId: string,
    links: { recipeId: string; dayNumber: number }[],
  ): Promise<void> {
    for (let i = 0; i < links.length; i++) {
      const mealPlanRecipe = this.mealPlanRecipeRepo.create({
        mealPlanId,
        recipeId: links[i].recipeId,
        dayNumber: links[i].dayNumber,
        position: i,
      });
      await this.mealPlanRecipeRepo.save(mealPlanRecipe);
    }
  }

  private async findOneEntity(userId: string, id: string): Promise<MealPlan> {
    const mealPlan = await this.mealPlanRepo.findOne({
      where: { id },
      relations: [
        'mealPlanRecipes',
        'mealPlanRecipes.recipe',
        'mealPlanRecipes.recipe.ingredients',
      ],
    });

    if (!mealPlan) {
      throw new NotFoundException(`Meal plan ${id} not found`);
    }

    if (mealPlan.userId !== userId) {
      throw new ForbiddenException();
    }

    return mealPlan;
  }
}
