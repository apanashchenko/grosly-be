import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlanType } from '../subscription/enums/plan-type.enum';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PlanType, unique: true })
  type: PlanType;

  // Usage limits (0 = unlimited)
  @Column({ type: 'int', default: 0 })
  maxRecipeGenerationsPerDay: number;

  @Column({ type: 'int', default: 0 })
  maxParseRequestsPerDay: number;

  @Column({ type: 'int', default: 0 })
  maxParseImageRequestsPerDay: number;

  @Column({ type: 'int', default: 0 })
  maxSmartGroupRequestsPerDay: number;

  @Column({ type: 'int', default: 0 })
  maxShoppingLists: number;

  @Column({ type: 'int', default: 0 })
  maxCustomCategories: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
