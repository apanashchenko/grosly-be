import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { MealPlanRecipe } from './meal-plan-recipe.entity';
import { RecipeIngredient } from './recipe-ingredient.entity';
import { RecipeSource } from '../recipes/enums/recipe-source.enum';

@Entity('recipes')
export class Recipe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'enum', enum: RecipeSource })
  source: RecipeSource;

  @Column({ type: 'text' })
  text: string;

  @ManyToOne(() => User, (user) => user.recipes, { onDelete: 'CASCADE' })
  user: User;

  @Index('recipes_userid_idx')
  @Column()
  userId: string;

  @OneToMany(() => RecipeIngredient, (ing) => ing.recipe, {
    cascade: true,
    eager: true,
  })
  ingredients: RecipeIngredient[];

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => MealPlanRecipe, (mpr) => mpr.recipe)
  mealPlanRecipes: MealPlanRecipe[];

  @UpdateDateColumn()
  updatedAt: Date;
}
