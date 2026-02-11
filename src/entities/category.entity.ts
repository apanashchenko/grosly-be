import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  ManyToOne,
  Unique,
} from 'typeorm';
import { Product } from './product.entity';
import { User } from './user.entity';

@Entity('categories')
@Unique(['name', 'userId'])
@Unique(['slug', 'userId'])
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g., 'Vegetables', 'Meat', 'Dairy'

  @Column()
  slug: string; // e.g., 'vegetables', 'meat', 'dairy'

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  icon: string | null; // emoji or icon name, e.g., '🥕', '🥩', '🥛'

  @ManyToOne(() => User, (user) => user.categories, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  user: User | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null; // null = system category, set = user's custom

  @ManyToMany(() => Product, (product) => product.categories)
  products: Product[];
}
