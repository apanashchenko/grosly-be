import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserPreferences } from '../entities/user-preferences.entity';
import { Allergy } from '../entities/allergy.entity';
import { DietaryRestriction } from '../entities/dietary-restriction.entity';
import { User } from '../entities/user.entity';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';

@Injectable()
export class UserPreferencesService {
  constructor(
    @InjectPinoLogger(UserPreferencesService.name)
    private readonly logger: PinoLogger,
    @InjectRepository(UserPreferences)
    private readonly preferencesRepo: Repository<UserPreferences>,
    @InjectRepository(Allergy)
    private readonly allergyRepo: Repository<Allergy>,
    @InjectRepository(DietaryRestriction)
    private readonly dietaryRestrictionRepo: Repository<DietaryRestriction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getAllAllergies(): Promise<Allergy[]> {
    return this.allergyRepo.find({ order: { name: 'ASC' } });
  }

  async getAllDietaryRestrictions(): Promise<DietaryRestriction[]> {
    return this.dietaryRestrictionRepo.find({ order: { name: 'ASC' } });
  }

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    let prefs = await this.preferencesRepo.findOne({
      where: { user: { id: userId } },
      relations: ['allergies', 'dietaryRestrictions'],
    });

    if (!prefs) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      prefs = this.preferencesRepo.create({
        user,
        allergies: [],
        dietaryRestrictions: [],
      });
      prefs = await this.preferencesRepo.save(prefs);

      this.logger.info({ userId }, 'Created default user preferences');
    }

    return prefs;
  }

  async updateUserPreferences(
    userId: string,
    dto: UpdateUserPreferencesDto,
  ): Promise<UserPreferences> {
    const prefs = await this.getUserPreferences(userId);

    if (dto.allergyIds !== undefined) {
      if (dto.allergyIds.length === 0) {
        prefs.allergies = [];
      } else {
        const allergies = await this.allergyRepo.findBy({
          id: In(dto.allergyIds),
        });
        if (allergies.length !== dto.allergyIds.length) {
          const found = new Set(allergies.map((a) => a.id));
          const missing = dto.allergyIds.filter((id) => !found.has(id));
          throw new NotFoundException(
            `Allergies not found: ${missing.join(', ')}`,
          );
        }
        prefs.allergies = allergies;
      }
    }

    if (dto.dietaryRestrictionIds !== undefined) {
      if (dto.dietaryRestrictionIds.length === 0) {
        prefs.dietaryRestrictions = [];
      } else {
        const restrictions = await this.dietaryRestrictionRepo.findBy({
          id: In(dto.dietaryRestrictionIds),
        });
        if (restrictions.length !== dto.dietaryRestrictionIds.length) {
          const found = new Set(restrictions.map((r) => r.id));
          const missing = dto.dietaryRestrictionIds.filter(
            (id) => !found.has(id),
          );
          throw new NotFoundException(
            `Dietary restrictions not found: ${missing.join(', ')}`,
          );
        }
        prefs.dietaryRestrictions = restrictions;
      }
    }

    if (dto.defaultServings !== undefined) {
      prefs.defaultServings = dto.defaultServings;
    }

    if (dto.customNotes !== undefined) {
      prefs.customNotes = dto.customNotes ?? null;
    }

    const saved = await this.preferencesRepo.save(prefs);

    this.logger.info({ userId }, 'User preferences updated');

    return saved;
  }
}
