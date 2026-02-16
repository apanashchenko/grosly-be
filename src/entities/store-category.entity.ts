import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Store } from './store.entity';
import { StoreProduct } from './store-product.entity';
import { Category } from './category.entity';

@Entity('store_categories')
@Unique(['storeId', 'slug'])
export class StoreCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Store, (store) => store.categories, { onDelete: 'CASCADE' })
  store: Store;

  @Index()
  @Column({ type: 'uuid' })
  storeId: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  category: Category | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @OneToMany(() => StoreProduct, (product) => product.storeCategory)
  products: StoreProduct[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
