import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { Paginate, Paginated } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { User } from '../entities/user.entity';
import { MealPlan } from '../entities/meal-plan.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireUsageLimit } from '../subscription/decorators/require-usage-limit.decorator';
import { UsageAction } from '../subscription/enums/usage-action.enum';
import { MealPlansService } from './meal-plans.service';
import { CreateMealPlanDto } from './dto/create-meal-plan.dto';
import { UpdateMealPlanDto } from './dto/update-meal-plan.dto';
import {
  MealPlanResponseDto,
  MealPlanListItemDto,
} from './dto/meal-plan-response.dto';

@ApiTags('meal-plans')
@ApiBearerAuth()
@Controller('meal-plans')
export class MealPlansController {
  constructor(private readonly mealPlansService: MealPlansService) {}

  @Post()
  @RequireUsageLimit(UsageAction.MEAL_PLAN_SAVE)
  @ApiOperation({
    summary: 'Create a meal plan',
    description: 'Creates an empty meal plan. Add recipes via PATCH.',
  })
  @ApiResponse({ status: 201, type: MealPlanResponseDto })
  async create(
    @CurrentUser() user: User,
    @Body(new ValidationPipe()) dto: CreateMealPlanDto,
  ): Promise<MealPlanResponseDto> {
    return this.mealPlansService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all meal plans (paginated)' })
  @ApiResponse({ status: 200 })
  async findAll(
    @CurrentUser() user: User,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<MealPlan>> {
    const result = await this.mealPlansService.findAllByUser(user.id, query);
    return {
      ...result,
      data: result.data.map((plan) =>
        MealPlanListItemDto.fromEntity(plan),
      ) as unknown as MealPlan[],
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get meal plan by ID' })
  @ApiParam({
    name: 'id',
    description: 'Meal plan UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({ status: 200, type: MealPlanResponseDto })
  @ApiResponse({ status: 404, description: 'Meal plan not found' })
  async findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MealPlanResponseDto> {
    return this.mealPlansService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update meal plan',
    description:
      'Update name, days, people, shoppingListId, or recipes (full replace by IDs).',
  })
  @ApiParam({
    name: 'id',
    description: 'Meal plan UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({ status: 200, type: MealPlanResponseDto })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe()) dto: UpdateMealPlanDto,
  ): Promise<MealPlanResponseDto> {
    return this.mealPlansService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a meal plan' })
  @ApiParam({
    name: 'id',
    description: 'Meal plan UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({ status: 204, description: 'Meal plan deleted' })
  async delete(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.mealPlansService.delete(user.id, id);
  }
}
