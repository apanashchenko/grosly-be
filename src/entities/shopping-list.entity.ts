import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { ShoppingListItem } from './shopping-list-item.entity';
import { Recipe } from './recipe.entity';

@Entity('shopping_lists')
export class ShoppingList {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => User, (user) => user.shoppingLists, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @Column({ default: false })
  groupedByCategories: boolean;

  @OneToMany(() => ShoppingListItem, (item) => item.shoppingList, {
    cascade: true,
    eager: true,
  })
  items: ShoppingListItem[];

  @OneToMany(() => Recipe, (recipe) => recipe.shoppingList)
  recipes: Recipe[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
