import { Injectable, Logger } from '@nestjs/common';
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
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
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
      lastLoginAt: new Date(),
    });

    const savedUser = await this.usersRepository.save(user);

    this.logger.log(
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
