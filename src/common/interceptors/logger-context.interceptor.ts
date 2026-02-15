import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PinoLogger } from 'nestjs-pino';

/**
 * Adds userId to the pino log context for every authenticated request.
 * Runs after guards, so request.user is already populated by JwtAuthGuard.
 */
@Injectable()
export class LoggerContextInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    if (request.user?.id) {
      this.logger.assign({ userId: request.user.id });
    }

    return next.handle();
  }
}
