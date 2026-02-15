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

@Entity('meal_plans')
export class MealPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 1 })
  numberOfDays: number;

  @Column({ type: 'int', default: 1 })
  numberOfPeople: number;

  @Column({ type: 'varchar', length: 5000, nullable: true })
  originalInput: string | null;

  @ManyToOne(() => User, (user) => user.mealPlans, { onDelete: 'CASCADE' })
  user: User;

  @Index('meal_plans_user_id_idx')
  @Column()
  userId: string;

  @OneToMany(() => MealPlanRecipe, (mpr) => mpr.mealPlan, {
    eager: true,
  })
  mealPlanRecipes: MealPlanRecipe[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
