import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, Paginated, PaginationType } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { MealPlan } from '../entities/meal-plan.entity';
import { MealPlanRecipe } from '../entities/meal-plan-recipe.entity';
import { Recipe } from '../entities/recipe.entity';
import { CreateMealPlanDto } from './dto/create-meal-plan.dto';
import { UpdateMealPlanDto } from './dto/update-meal-plan.dto';
import { MealPlanResponseDto } from './dto/meal-plan-response.dto';

@Injectable()
export class MealPlansService {
  private readonly logger = new Logger(MealPlansService.name);

  constructor(
    @InjectRepository(MealPlan)
    private readonly mealPlanRepo: Repository<MealPlan>,
    @InjectRepository(MealPlanRecipe)
    private readonly mealPlanRecipeRepo: Repository<MealPlanRecipe>,
    @InjectRepository(Recipe)
    private readonly recipeRepo: Repository<Recipe>,
  ) {}

  async create(
    userId: string,
    dto: CreateMealPlanDto,
  ): Promise<MealPlanResponseDto> {
    const name =
      dto.name || `Meal plan ${new Date().toISOString().split('T')[0]}`;

    const mealPlan = this.mealPlanRepo.create({
      name,
      numberOfDays: dto.numberOfDays ?? 1,
      numberOfPeople: dto.numberOfPeople ?? 1,
      userId,
    });

    const saved = await this.mealPlanRepo.save(mealPlan);

    this.logger.log(
      { id: saved.id, name: saved.name },
      'Meal plan created',
    );

    return MealPlanResponseDto.fromEntity(saved);
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

  async findOne(
    userId: string,
    id: string,
  ): Promise<MealPlanResponseDto> {
    const mealPlan = await this.findOneEntity(userId, id);
    return MealPlanResponseDto.fromEntity(mealPlan);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateMealPlanDto,
  ): Promise<MealPlanResponseDto> {
    const mealPlan = await this.findOneEntity(userId, id);

    const updateData: Partial<MealPlan> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.numberOfDays !== undefined)
      updateData.numberOfDays = dto.numberOfDays;
    if (dto.numberOfPeople !== undefined)
      updateData.numberOfPeople = dto.numberOfPeople;
    if (dto.shoppingListId !== undefined)
      updateData.shoppingListId = dto.shoppingListId;

    if (Object.keys(updateData).length > 0) {
      await this.mealPlanRepo.update(id, updateData);
    }

    if (dto.recipes !== undefined) {
      await this.replaceRecipes(userId, mealPlan, dto.recipes);
    }

    this.logger.log({ id }, 'Meal plan updated');

    const result = await this.findOneEntity(userId, id);
    return MealPlanResponseDto.fromEntity(result);
  }

  async delete(userId: string, id: string): Promise<void> {
    const mealPlan = await this.findOneEntity(userId, id);
    await this.mealPlanRepo.remove(mealPlan);

    this.logger.log({ id }, 'Meal plan deleted');
  }

  private async replaceRecipes(
    userId: string,
    mealPlan: MealPlan,
    recipeIds: string[],
  ): Promise<void> {
    // Verify all recipes exist and belong to the user
    for (const recipeId of recipeIds) {
      const recipe = await this.recipeRepo.findOne({
        where: { id: recipeId },
      });

      if (!recipe) {
        throw new NotFoundException(`Recipe ${recipeId} not found`);
      }

      if (recipe.userId !== userId) {
        throw new ForbiddenException(
          `Recipe ${recipeId} does not belong to you`,
        );
      }
    }

    // Delete existing join records
    await this.mealPlanRecipeRepo.delete({ mealPlanId: mealPlan.id });

    // Create new join records
    for (let i = 0; i < recipeIds.length; i++) {
      const mealPlanRecipe = this.mealPlanRecipeRepo.create({
        mealPlanId: mealPlan.id,
        recipeId: recipeIds[i],
        dayNumber: 1,
        position: i,
      });
      await this.mealPlanRecipeRepo.save(mealPlanRecipe);
    }
  }

  private async findOneEntity(
    userId: string,
    id: string,
  ): Promise<MealPlan> {
    const mealPlan = await this.mealPlanRepo.findOne({
      where: { id },
      relations: ['mealPlanRecipes', 'mealPlanRecipes.recipe'],
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
