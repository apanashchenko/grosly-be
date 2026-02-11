import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SpaceMember } from './space-member.entity';
import { ShoppingList } from './shopping-list.entity';
import { SpaceInvitation } from './space-invitation.entity';

@Entity('spaces')
export class Space {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @OneToMany(() => SpaceMember, (member) => member.space, { cascade: true })
  members: SpaceMember[];

  @OneToMany(() => ShoppingList, (list) => list.space)
  shoppingLists: ShoppingList[];

  @OneToMany(() => SpaceInvitation, (invitation) => invitation.space)
  invitations: SpaceInvitation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
