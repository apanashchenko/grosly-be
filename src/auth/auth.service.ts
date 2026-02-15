import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { OAuth2Client } from 'google-auth-library';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { User } from '../entities/user.entity';
import { SpaceInvitation } from '../entities/space-invitation.entity';
import { InvitationStatus } from '../spaces/enums/invitation-status.enum';
import { AuthProvider } from './enums/auth-provider.enum';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  private refreshTokenExpiration: string;

  constructor(
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
    private usersService: UsersService,
    private subscriptionService: SubscriptionService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(SpaceInvitation)
    private readonly invitationRepo: Repository<SpaceInvitation>,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
    this.refreshTokenExpiration =
      this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';
  }

  async googleLogin(idToken: string): Promise<AuthResponseDto> {
    // 1. Verify Google ID token
    const googleUser = await this.verifyGoogleToken(idToken);

    // 2. Find or create user
    let user = await this.usersService.findByProviderId(
      AuthProvider.GOOGLE,
      googleUser.sub,
    );

    if (!user) {
      // Check if email already exists with a different provider
      user = await this.usersService.findByEmail(googleUser.email);

      if (user) {
        this.logger.warn(
          { email: googleUser.email, existingProvider: user.authProvider },
          'Email already registered with different provider',
        );
        throw new UnauthorizedException(
          'This email is already registered with a different sign-in method',
        );
      }

      // Create new user
      user = await this.usersService.createFromOAuth({
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.picture,
        authProvider: AuthProvider.GOOGLE,
        providerId: googleUser.sub,
        language: googleUser.locale,
      });

      // Create trial subscription for new user
      await this.subscriptionService.createTrialSubscription(user.id);

      // Link any pending space invitations sent to this email
      await this.linkPendingInvitations(user.id, user.email);
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // 3. Update last login
    await this.usersService.updateLastLogin(user.id);

    // 4. Generate tokens
    const tokens = await this.generateTokens(user);

    // 5. Store hashed refresh token
    const hashedRefreshToken = this.hashToken(tokens.refreshToken);
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

    this.logger.info({ userId: user.id }, 'Google login successful');

    return {
      ...tokens,
      user: this.mapUserToDto(user),
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
    // 1. Verify the refresh token JWT
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 2. Find user
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive || !user.refreshToken) {
      throw new UnauthorizedException('User not found or token revoked');
    }

    // 3. Verify that the provided refresh token matches the stored hash
    const isMatch = this.verifyTokenHash(refreshToken, user.refreshToken);
    if (!isMatch) {
      // Possible token reuse attack -- invalidate all refresh tokens
      await this.usersService.updateRefreshToken(user.id, null);
      this.logger.warn(
        { userId: user.id },
        'Refresh token mismatch -- possible token reuse attack',
      );
      throw new UnauthorizedException('Token has been revoked');
    }

    // 4. Generate new token pair (token rotation)
    const tokens = await this.generateTokens(user);

    // 5. Store new hashed refresh token
    const hashedRefreshToken = this.hashToken(tokens.refreshToken);
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

    this.logger.info({ userId: user.id }, 'Tokens refreshed successfully');

    return {
      ...tokens,
      user: this.mapUserToDto(user),
    };
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
    this.logger.info({ userId }, 'User logged out');
  }

  private async verifyGoogleToken(idToken: string): Promise<{
    sub: string;
    email: string;
    name: string;
    picture: string;
    locale: string;
  }> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

      return {
        sub: payload.sub,
        email: payload.email!,
        name: payload.name || payload.email!,
        picture: payload.picture || '',
        locale: payload.locale || 'uk',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;

      this.logger.error(
        { error: (error as Error).message },
        'Google token verification failed',
      );
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        expiresIn: this
          .refreshTokenExpiration as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private verifyTokenHash(token: string, hash: string): boolean {
    const tokenHash = this.hashToken(token);
    return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
  }

  private async linkPendingInvitations(
    userId: string,
    email: string,
  ): Promise<void> {
    const result = await this.invitationRepo.update(
      {
        email: email.toLowerCase(),
        status: InvitationStatus.PENDING,
        inviteeId: IsNull() as unknown as string,
      },
      { inviteeId: userId },
    );

    if (result.affected && result.affected > 0) {
      this.logger.info(
        { userId, email, count: result.affected },
        'Linked pending invitations to new user',
      );
    }
  }

  private mapUserToDto(user: User): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      language: user.language,
    };
  }
}
