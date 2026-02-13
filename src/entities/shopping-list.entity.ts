import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Space } from './space.entity';
import { ShoppingListItem } from './shopping-list-item.entity';

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

  @ManyToOne(() => Space, (space) => space.shoppingLists, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  space: Space | null;

  @Index('shopping_lists_space_id_idx')
  @Column({ type: 'uuid', nullable: true })
  spaceId: string | null;

  @Column({ default: false })
  groupedByCategories: boolean;

  @VersionColumn({ default: 1 })
  version: number;

  @OneToMany(() => ShoppingListItem, (item) => item.shoppingList, {
    cascade: true,
    eager: true,
  })
  items: ShoppingListItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
