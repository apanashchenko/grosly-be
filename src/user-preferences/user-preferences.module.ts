import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPreferencesController } from './user-preferences.controller';
import { UserPreferencesService } from './user-preferences.service';
import { UserPreferences } from '../entities/user-preferences.entity';
import { Allergy } from '../entities/allergy.entity';
import { DietaryRestriction } from '../entities/dietary-restriction.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserPreferences,
      Allergy,
      DietaryRestriction,
      User,
    ]),
  ],
  controllers: [UserPreferencesController],
  providers: [UserPreferencesService],
  exports: [UserPreferencesService],
})
export class UserPreferencesModule {}
