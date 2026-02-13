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
import { ShoppingList } from './shopping-list.entity';
import { MealPlanRecipe } from './meal-plan-recipe.entity';

@Entity('meal_plans')
export class MealPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'int', default: 1 })
  numberOfDays: number;

  @Column({ type: 'int', default: 1 })
  numberOfPeople: number;

  @ManyToOne(() => User, (user) => user.mealPlans, { onDelete: 'CASCADE' })
  user: User;

  @Index('meal_plans_user_id_idx')
  @Column()
  userId: string;

  @ManyToOne(() => ShoppingList, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  shoppingList: ShoppingList | null;

  @Column({ type: 'uuid', nullable: true })
  shoppingListId: string | null;

  @OneToMany(() => MealPlanRecipe, (mpr) => mpr.mealPlan, {
    eager: true,
  })
  mealPlanRecipes: MealPlanRecipe[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
