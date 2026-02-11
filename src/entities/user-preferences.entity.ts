import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Allergy } from './allergy.entity';
import { DietaryRestriction } from './dietary-restriction.entity';
import { Product } from './product.entity';

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.preferences)
  @JoinColumn()
  user: User;

  @ManyToMany(() => Allergy, (allergy) => allergy.userPreferences)
  @JoinTable({
    name: 'user_allergies',
    joinColumn: { name: 'user_preferences_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'allergy_id', referencedColumnName: 'id' },
  })
  allergies: Allergy[];

  @ManyToMany(
    () => DietaryRestriction,
    (restriction) => restriction.userPreferences,
  )
  @JoinTable({
    name: 'user_dietary_restrictions',
    joinColumn: { name: 'user_preferences_id', referencedColumnName: 'id' },
    inverseJoinColumn: {
      name: 'dietary_restriction_id',
      referencedColumnName: 'id',
    },
  })
  dietaryRestrictions: DietaryRestriction[];

  @ManyToMany(() => Product, (product) => product.userPreferences)
  @JoinTable({
    name: 'user_favorite_products',
    joinColumn: { name: 'user_preferences_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'product_id', referencedColumnName: 'id' },
  })
  favoriteProducts: Product[];

  @Column({ default: 2 })
  defaultServings: number;

  @Column({ type: 'text', nullable: true })
  customNotes: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
