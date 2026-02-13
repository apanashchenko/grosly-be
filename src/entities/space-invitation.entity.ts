import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Space } from './space.entity';
import { User } from './user.entity';
import { InvitationStatus } from '../spaces/enums/invitation-status.enum';

@Entity('space_invitations')
@Index('space_invitations_space_id_status_idx', ['spaceId', 'status'])
@Index('space_invitations_invitee_id_status_idx', ['inviteeId', 'status'])
@Index('space_invitations_email_status_idx', ['email', 'status'])
export class SpaceInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Space, (space) => space.invitations, { onDelete: 'CASCADE' })
  space: Space;

  @Column()
  spaceId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  inviter: User;

  @Column()
  inviterId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  invitee: User | null;

  @Column({ nullable: true })
  inviteeId: string | null;

  @Column()
  email: string;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
