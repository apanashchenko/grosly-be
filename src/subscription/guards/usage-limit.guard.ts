import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USAGE_LIMIT_ACTION_KEY } from '../decorators/require-usage-limit.decorator';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { SubscriptionService } from '../subscription.service';
import { UsageAction } from '../enums/usage-action.enum';

@Injectable()
export class UsageLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<UsageAction>(
      USAGE_LIMIT_ACTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!action) {
      return true; // No usage limit — pass through
    }

    // Skip for public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true; // Let JwtAuthGuard handle auth
    }

    const result = await this.subscriptionService.checkAndIncrementUsage(
      user.id,
      action,
    );

    if (!result.allowed) {
      const limitText =
        result.limit === 0 ? 'unlimited' : `${result.current}/${result.limit}`;
      throw new ForbiddenException(
        `Daily limit reached (${limitText}). Upgrade your plan for more.`,
      );
    }

    return true;
  }
}
