import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { UserPreferences } from './user-preferences.entity';
import { ShoppingList } from './shopping-list.entity';
import { Category } from './category.entity';
import { Subscription } from './subscription.entity';
import { Recipe } from './recipe.entity';
import { MealPlan } from './meal-plan.entity';
import { SpaceMember } from './space-member.entity';
import { AuthProvider } from '../auth/enums/auth-provider.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 'uk' })
  language: string; // 'uk', 'en', 'ru' - interface language

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.GOOGLE,
  })
  authProvider: AuthProvider;

  @Column({ nullable: true })
  providerId: string; // Google sub ID, Apple ID, etc.

  @Column({ type: 'varchar', nullable: true })
  refreshToken: string | null; // SHA-256 hashed refresh token

  @Column({ type: 'varchar', nullable: true })
  passwordHash: string | null; // For future email/password auth

  @OneToOne(() => UserPreferences, (preferences) => preferences.user, {
    nullable: true,
  })
  preferences: UserPreferences;

  @OneToMany(() => ShoppingList, (list) => list.user)
  shoppingLists: ShoppingList[];

  @OneToMany(() => Category, (cat) => cat.user)
  categories: Category[];

  @OneToMany(() => Recipe, (recipe) => recipe.user)
  recipes: Recipe[];

  @OneToOne(() => Subscription, (sub) => sub.user, { nullable: true })
  subscription: Subscription;

  @OneToMany(() => MealPlan, (plan) => plan.user)
  mealPlans: MealPlan[];

  @OneToMany(() => SpaceMember, (member) => member.user)
  spaceMembers: SpaceMember[];
}
