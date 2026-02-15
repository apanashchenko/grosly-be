import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
} from 'typeorm';
import { Recipe } from './recipe.entity';
import { Category } from './category.entity';

@Entity('recipe_ingredients')
@Index('recipe_ingredients_category_id_idx', ['categoryId'])
export class RecipeIngredient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Recipe, (recipe) => recipe.ingredients, {
    onDelete: 'CASCADE',
  })
  recipe: Recipe;

  @Index('recipe_ingredients_recipeid_idx')
  @Column()
  recipeId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ length: 50 })
  unit: string;

  @ManyToOne(() => Category, { nullable: true, eager: true })
  category: Category | null;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  note: string | null;

  @Column({ type: 'int', default: 0 })
  position: number;
}
