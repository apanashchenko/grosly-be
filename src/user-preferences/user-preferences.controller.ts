import { Controller, Get, Patch, Body, ValidationPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserPreferencesService } from './user-preferences.service';
import { AllergyResponseDto } from './dto/allergy-response.dto';
import { DietaryRestrictionResponseDto } from './dto/dietary-restriction-response.dto';
import { UserPreferencesResponseDto } from './dto/user-preferences-response.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { CurrentUser } from '../auth/decorators';
import { User } from '../entities/user.entity';

@ApiBearerAuth()
@Controller()
export class UserPreferencesController {
  constructor(
    private readonly userPreferencesService: UserPreferencesService,
  ) {}

  @Get('allergies')
  @ApiTags('allergies')
  @ApiOperation({
    summary: 'Get all available allergies',
    description: 'Returns a list of all allergies that users can select.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of allergies',
    type: [AllergyResponseDto],
  })
  async getAllAllergies(): Promise<AllergyResponseDto[]> {
    const allergies = await this.userPreferencesService.getAllAllergies();
    return allergies.map((a) => AllergyResponseDto.fromEntity(a));
  }

  @Get('dietary-restrictions')
  @ApiTags('dietary-restrictions')
  @ApiOperation({
    summary: 'Get all available dietary restrictions',
    description:
      'Returns a list of all dietary restrictions that users can select.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of dietary restrictions',
    type: [DietaryRestrictionResponseDto],
  })
  async getAllDietaryRestrictions(): Promise<DietaryRestrictionResponseDto[]> {
    const restrictions =
      await this.userPreferencesService.getAllDietaryRestrictions();
    return restrictions.map((r) => DietaryRestrictionResponseDto.fromEntity(r));
  }

  @Get('users/me/preferences')
  @ApiTags('users')
  @ApiOperation({
    summary: 'Get current user preferences',
    description:
      "Returns the authenticated user's allergies, dietary restrictions, and default servings.",
  })
  @ApiResponse({
    status: 200,
    description: 'User preferences',
    type: UserPreferencesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getPreferences(
    @CurrentUser() user: User,
  ): Promise<UserPreferencesResponseDto> {
    const prefs = await this.userPreferencesService.getUserPreferences(user.id);
    return UserPreferencesResponseDto.fromEntity(prefs);
  }

  @Patch('users/me/preferences')
  @ApiTags('users')
  @ApiOperation({
    summary: 'Update current user preferences',
    description:
      "Partially updates the authenticated user's preferences. Only provided fields are changed.",
  })
  @ApiResponse({
    status: 200,
    description: 'Updated user preferences',
    type: UserPreferencesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'One or more allergy/dietary restriction IDs not found',
  })
  async updatePreferences(
    @CurrentUser() user: User,
    @Body(new ValidationPipe()) dto: UpdateUserPreferencesDto,
  ): Promise<UserPreferencesResponseDto> {
    const prefs = await this.userPreferencesService.updateUserPreferences(
      user.id,
      dto,
    );
    return UserPreferencesResponseDto.fromEntity(prefs);
  }
}
