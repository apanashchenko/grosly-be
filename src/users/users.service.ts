import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { AuthProvider } from '../auth/enums/auth-provider.enum';

export interface CreateUserFromOAuthParams {
  email: string;
  name: string;
  avatarUrl: string;
  authProvider: AuthProvider;
  providerId: string;
  language: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectPinoLogger(UsersService.name) private readonly logger: PinoLogger,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByProviderId(
    authProvider: AuthProvider,
    providerId: string,
  ): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { authProvider, providerId },
    });
  }

  async createFromOAuth(params: CreateUserFromOAuthParams): Promise<User> {
    const user = this.usersRepository.create({
      email: params.email,
      name: params.name,
      avatarUrl: params.avatarUrl,
      authProvider: params.authProvider,
      providerId: params.providerId,
      language: params.language === 'ru' ? 'uk' : params.language,
      lastLoginAt: new Date(),
    });

    const savedUser = await this.usersRepository.save(user);

    this.logger.info(
      { userId: savedUser.id, provider: params.authProvider },
      'New user created from OAuth',
    );

    return savedUser;
  }

  async updateRefreshToken(
    userId: string,
    hashedRefreshToken: string | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      lastLoginAt: new Date(),
    });
  }
}
