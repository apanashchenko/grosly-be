import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { UserPreferences } from './user-preferences.entity';

@Entity('dietary_restrictions')
export class DietaryRestriction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // e.g., 'Vegetarian', 'Vegan', 'Gluten-free'

  @Column({ unique: true })
  slug: string; // e.g., 'vegetarian', 'vegan', 'gluten-free'

  @Column({ nullable: true })
  description: string;

  @ManyToMany(() => UserPreferences, (prefs) => prefs.dietaryRestrictions)
  userPreferences: UserPreferences[];
}
