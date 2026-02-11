import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { UserPreferences } from './user-preferences.entity';

@Entity('allergies')
export class Allergy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // e.g., 'Milk', 'Nuts', 'Gluten'

  @Column({ unique: true })
  slug: string; // e.g., 'milk', 'nuts', 'gluten'

  @Column({ nullable: true })
  description: string;

  @ManyToMany(() => UserPreferences, (prefs) => prefs.allergies)
  userPreferences: UserPreferences[];
}
