import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Intercepteur pour logger les réponses des endpoints Discord
 */
@Injectable()
export class DiscordResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DiscordResponseInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        this.logger.debug(
          `[${method}] ${url} - Completed in ${responseTime}ms`,
        );
      }),
    );
  }
}
