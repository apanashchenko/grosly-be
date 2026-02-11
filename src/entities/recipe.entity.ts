import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { ShoppingList } from './shopping-list.entity';
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

  @ManyToOne(() => ShoppingList, (list) => list.recipes, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  shoppingList: ShoppingList | null;

  @Column({ type: 'uuid', nullable: true })
  shoppingListId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
