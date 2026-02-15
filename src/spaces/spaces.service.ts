import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, Paginated, PaginationType } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { Space } from '../entities/space.entity';
import { SpaceMember } from '../entities/space-member.entity';
import { SpaceInvitation } from '../entities/space-invitation.entity';
import { UsersService } from '../users/users.service';
import { SpaceRole } from './enums/space-role.enum';
import { InvitationStatus } from './enums/invitation-status.enum';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import {
  RespondInvitationDto,
  InvitationAction,
} from './dto/respond-invitation.dto';

@Injectable()
export class SpacesService {
  constructor(
    @InjectPinoLogger(SpacesService.name)
    private readonly logger: PinoLogger,
    @InjectRepository(Space)
    private readonly spaceRepo: Repository<Space>,
    @InjectRepository(SpaceMember)
    private readonly memberRepo: Repository<SpaceMember>,
    @InjectRepository(SpaceInvitation)
    private readonly invitationRepo: Repository<SpaceInvitation>,
    private readonly usersService: UsersService,
  ) {}

  async create(userId: string, dto: CreateSpaceDto): Promise<Space> {
    const space = this.spaceRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      members: [
        this.memberRepo.create({
          userId,
          role: SpaceRole.OWNER,
        }),
      ],
    });

    const saved = await this.spaceRepo.save(space);

    this.logger.info({ spaceId: saved.id, ownerId: userId }, 'Space created');

    return this.findOne(saved.id, userId);
  }

  async findAllByUser(
    userId: string,
    query: PaginateQuery,
  ): Promise<Paginated<Space>> {
    const qb = this.spaceRepo
      .createQueryBuilder('space')
      .innerJoin('space.members', 'member', 'member.userId = :userId', {
        userId,
      })
      .leftJoinAndSelect('space.members', 'allMembers')
      .leftJoinAndSelect('allMembers.user', 'user');

    return paginate(query, qb, {
      sortableColumns: ['createdAt', 'id'],
      defaultSortBy: [['createdAt', 'DESC']],
      paginationType: PaginationType.CURSOR,
    });
  }

  async findOne(spaceId: string, userId: string): Promise<Space> {
    const space = await this.spaceRepo.findOne({
      where: { id: spaceId },
      relations: ['members', 'members.user'],
    });

    if (!space) {
      throw new NotFoundException(`Space ${spaceId} not found`);
    }

    const isMember = space.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this space');
    }

    return space;
  }

  async update(
    spaceId: string,
    userId: string,
    dto: UpdateSpaceDto,
  ): Promise<Space> {
    const space = await this.findOne(spaceId, userId);
    this.assertOwner(space, userId);

    if (dto.name !== undefined) {
      space.name = dto.name;
    }
    if (dto.description !== undefined) {
      space.description = dto.description;
    }

    await this.spaceRepo.save(space);

    this.logger.info({ spaceId }, 'Space updated');

    return this.findOne(spaceId, userId);
  }

  async delete(spaceId: string, userId: string): Promise<void> {
    const space = await this.findOne(spaceId, userId);
    this.assertOwner(space, userId);

    await this.spaceRepo.remove(space);

    this.logger.info({ spaceId }, 'Space deleted');
  }

  async isMember(spaceId: string, userId: string): Promise<boolean> {
    const count = await this.memberRepo.count({
      where: { spaceId, userId },
    });
    return count > 0;
  }

  async inviteMember(
    spaceId: string,
    inviterId: string,
    dto: InviteMemberDto,
  ): Promise<void> {
    const space = await this.findOne(spaceId, inviterId);
    this.assertOwner(space, inviterId);

    const email = dto.email.toLowerCase();

    // Check for existing pending invitation by email
    const existingInvitation = await this.invitationRepo.findOne({
      where: {
        spaceId,
        email,
        status: InvitationStatus.PENDING,
      },
    });
    if (existingInvitation) {
      throw new BadRequestException('This email has already been invited');
    }

    // Look up invitee by email
    const invitee = await this.usersService.findByEmail(email);

    if (invitee) {
      const alreadyMember = space.members.some((m) => m.userId === invitee.id);
      if (alreadyMember) {
        throw new BadRequestException(
          'This user is already a member of the space',
        );
      }
    }

    const invitation = this.invitationRepo.create({
      spaceId,
      inviterId,
      email,
      inviteeId: invitee?.id ?? null,
      status: InvitationStatus.PENDING,
    });

    await this.invitationRepo.save(invitation);

    this.logger.info(
      { spaceId, email, inviteeId: invitee?.id ?? null },
      'Space invitation created',
    );
  }

  async getMyInvitations(userId: string): Promise<SpaceInvitation[]> {
    return this.invitationRepo.find({
      where: {
        inviteeId: userId,
        status: InvitationStatus.PENDING,
      },
      relations: ['space', 'inviter'],
      order: { createdAt: 'DESC' },
    });
  }

  async respondToInvitation(
    invitationId: string,
    userId: string,
    dto: RespondInvitationDto,
  ): Promise<void> {
    const invitation = await this.invitationRepo.findOne({
      where: {
        id: invitationId,
        inviteeId: userId,
        status: InvitationStatus.PENDING,
      },
    });

    if (!invitation) {
      throw new NotFoundException(`Invitation ${invitationId} not found`);
    }

    if (dto.action === InvitationAction.ACCEPT) {
      const member = this.memberRepo.create({
        spaceId: invitation.spaceId,
        userId,
        role: SpaceRole.MEMBER,
      });
      await this.memberRepo.save(member);
      await this.invitationRepo.remove(invitation);

      this.logger.info(
        { spaceId: invitation.spaceId, userId },
        'Space invitation accepted',
      );
    } else {
      invitation.status = InvitationStatus.DECLINED;
      await this.invitationRepo.save(invitation);

      this.logger.info(
        { spaceId: invitation.spaceId, userId },
        'Space invitation declined',
      );
    }
  }

  async removeMember(
    spaceId: string,
    ownerId: string,
    targetUserId: string,
  ): Promise<void> {
    const space = await this.findOne(spaceId, ownerId);
    this.assertOwner(space, ownerId);

    if (ownerId === targetUserId) {
      throw new ForbiddenException('Cannot remove yourself from the space');
    }

    const member = await this.memberRepo.findOne({
      where: { spaceId, userId: targetUserId },
    });

    if (!member) {
      throw new NotFoundException(
        `User ${targetUserId} is not a member of this space`,
      );
    }

    await this.memberRepo.remove(member);

    this.logger.info(
      { spaceId, removedUserId: targetUserId },
      'Space member removed',
    );
  }

  async cancelInvitation(
    spaceId: string,
    userId: string,
    invitationId: string,
  ): Promise<void> {
    const space = await this.findOne(spaceId, userId);
    this.assertOwner(space, userId);

    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId, spaceId },
    });

    if (!invitation) {
      throw new NotFoundException(
        `Invitation ${invitationId} not found in this space`,
      );
    }

    await this.invitationRepo.remove(invitation);

    this.logger.info({ spaceId, invitationId }, 'Space invitation cancelled');
  }

  async getSpaceInvitations(
    spaceId: string,
    userId: string,
  ): Promise<SpaceInvitation[]> {
    const space = await this.findOne(spaceId, userId);
    this.assertOwner(space, userId);

    return this.invitationRepo.find({
      where: { spaceId },
      relations: ['invitee'],
      order: { createdAt: 'DESC' },
    });
  }

  private assertOwner(space: Space, userId: string): void {
    const owner = space.members.find(
      (m) => m.userId === userId && m.role === SpaceRole.OWNER,
    );
    if (!owner) {
      throw new ForbiddenException(
        'Only the space owner can perform this action',
      );
    }
  }
}
