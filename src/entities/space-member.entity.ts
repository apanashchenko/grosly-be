import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Unique,
  Index,
} from 'typeorm';
import { Space } from './space.entity';
import { User } from './user.entity';
import { SpaceRole } from '../spaces/enums/space-role.enum';

@Entity('space_members')
@Unique(['spaceId', 'userId'])
export class SpaceMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Space, (space) => space.members, { onDelete: 'CASCADE' })
  space: Space;

  @Index('space_members_space_id_idx')
  @Column()
  spaceId: string;

  @ManyToOne(() => User, (user) => user.spaceMembers, { onDelete: 'CASCADE' })
  user: User;

  @Index('space_members_user_id_idx')
  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: SpaceRole,
    default: SpaceRole.MEMBER,
  })
  role: SpaceRole;

  @CreateDateColumn()
  joinedAt: Date;
}
