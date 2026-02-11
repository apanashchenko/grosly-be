import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { SpacesService } from '../spaces.service';

export const SPACE_HEADER = 'x-space-id';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class SpaceMemberGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly spacesService: SpacesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const spaceId = request.headers[SPACE_HEADER];

    if (!spaceId) {
      request.spaceId = null;
      return true;
    }

    if (!UUID_REGEX.test(spaceId)) {
      throw new BadRequestException('X-Space-Id must be a valid UUID');
    }

    const user = request.user;
    if (!user) {
      return true;
    }

    const isMember = await this.spacesService.isMember(spaceId, user.id);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this space');
    }

    request.spaceId = spaceId;
    return true;
  }
}
