import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { UserPreferences } from './user-preferences.entity';
import { Allergy } from './allergy.entity';
import { Category } from './category.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // e.g., 'Tomato', 'Potato', 'Beef'

  @Column({ unique: true })
  slug: string; // e.g., 'tomato', 'potato', 'beef'

  @Column({ nullable: true })
  description: string;

  @ManyToMany(() => Category, (category) => category.products)
  @JoinTable({
    name: 'product_categories',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: Category[];

  @ManyToMany(() => UserPreferences, (prefs) => prefs.favoriteProducts)
  userPreferences: UserPreferences[];

  @ManyToMany(() => Allergy)
  @JoinTable({
    name: 'product_allergens',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'allergy_id', referencedColumnName: 'id' },
  })
  allergens: Allergy[];
}
