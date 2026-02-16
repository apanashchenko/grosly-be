import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Store } from './store.entity';
import { StoreCategory } from './store-category.entity';

@Entity('store_products')
@Unique(['storeId', 'externalSlug'])
export class StoreProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Store, (store) => store.products, { onDelete: 'CASCADE' })
  store: Store;

  @Index()
  @Column({ type: 'uuid' })
  storeId: string;

  @ManyToOne(() => StoreCategory, (cat) => cat.products, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  storeCategory: StoreCategory | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  storeCategoryId: string | null;

  @Column()
  externalSlug: string;

  @Index()
  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  oldPrice: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  quantity: number | null;

  @Column()
  unit: string;

  @Column({ default: true })
  inStock: boolean;

  @Column({ type: 'timestamp' })
  lastScrapedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
