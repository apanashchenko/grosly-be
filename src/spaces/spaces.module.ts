import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';
import { Space } from '../entities/space.entity';
import { SpaceMember } from '../entities/space-member.entity';
import { SpaceInvitation } from '../entities/space-invitation.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Space, SpaceMember, SpaceInvitation]),
    UsersModule,
  ],
  controllers: [SpacesController],
  providers: [SpacesService],
  exports: [SpacesService],
})
export class SpacesModule {}
