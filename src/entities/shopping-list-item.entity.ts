import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ShoppingList } from './shopping-list.entity';
import { Category } from './category.entity';
import { User } from './user.entity';

@Entity('shopping_list_items')
@Index('shopping_list_items_created_by_user_id_idx', ['createdByUserId'])
@Index('shopping_list_items_shopping_list_id_idx', ['shoppingList'])
@Index('shopping_list_items_category_id_idx', ['categoryId'])
export class ShoppingListItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column()
  unit: string;

  @Column({ default: false })
  purchased: boolean;

  @ManyToOne(() => Category, { nullable: true, eager: true })
  category: Category | null;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  note: string | null;

  @Column({ type: 'int', default: 0 })
  position: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User | null;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @ManyToOne(() => ShoppingList, (list) => list.items, { onDelete: 'CASCADE' })
  shoppingList: ShoppingList;
}
