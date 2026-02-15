import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
  Index,
} from 'typeorm';
import { MealPlan } from './meal-plan.entity';
import { Recipe } from './recipe.entity';

@Entity('meal_plan_recipes')
@Unique('meal_plan_recipes_plan_recipe_day_uq', [
  'mealPlanId',
  'recipeId',
  'dayNumber',
])
export class MealPlanRecipe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MealPlan, (plan) => plan.mealPlanRecipes, {
    onDelete: 'CASCADE',
  })
  mealPlan: MealPlan;

  @Index('meal_plan_recipes_meal_plan_id_idx')
  @Column()
  mealPlanId: string;

  @ManyToOne(() => Recipe, (recipe) => recipe.mealPlanRecipes, {
    onDelete: 'CASCADE',
    eager: true,
  })
  recipe: Recipe;

  @Index('meal_plan_recipes_recipe_id_idx')
  @Column()
  recipeId: string;

  @Column({ type: 'int', default: 1 })
  dayNumber: number;

  @Column({ type: 'int', default: 0 })
  position: number;
}
