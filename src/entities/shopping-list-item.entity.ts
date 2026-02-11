import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { ShoppingList } from './shopping-list.entity';
import { Category } from './category.entity';

@Entity('shopping_list_items')
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

  @Column({ type: 'int', default: 0 })
  position: number;

  @ManyToOne(() => ShoppingList, (list) => list.items, { onDelete: 'CASCADE' })
  shoppingList: ShoppingList;
}
