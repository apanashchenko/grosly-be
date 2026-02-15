import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { UsageAction } from '../subscription/enums/usage-action.enum';

@Entity('usage_records')
@Unique(['userId', 'action', 'date'])
@Index('usage_record_user_date_idx', ['userId', 'date'])
export class UsageRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: UsageAction })
  action: UsageAction;

  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD

  @Column({ type: 'int', default: 0 })
  count: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
