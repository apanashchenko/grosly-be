import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { UsageAction } from '../subscription/enums/usage-action.enum';

@Entity('ai_request_logs')
@Index('ai_request_logs_user_id_idx', ['userId'])
@Index('ai_request_logs_action_idx', ['action'])
@Index('ai_request_logs_created_at_idx', ['createdAt'])
export class AiRequestLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: UsageAction })
  action: UsageAction;

  @Column({ type: 'varchar', length: 5000 })
  input: string;

  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  errorMessage: string | null;

  @Column({ type: 'int', nullable: true })
  durationMs: number | null;

  @Column({ type: 'int', nullable: true })
  promptTokens: number | null;

  @Column({ type: 'int', nullable: true })
  completionTokens: number | null;

  @Column({ type: 'int', nullable: true })
  totalTokens: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
