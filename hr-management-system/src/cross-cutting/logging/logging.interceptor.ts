import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggingService } from './logging.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly loggingService: LoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const responseTime = Date.now() - now;
          
          this.loggingService.logHttpRequest(
            method,
            url,
            response.statusCode,
            responseTime,
            user?.id,
          );
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          
          this.loggingService.error(
            `${method} ${url} - ${error.message}`,
            error.stack,
            'HTTP',
            {
              statusCode: error.status || 500,
              responseTime,
              userId: user?.id,
              body: method !== 'GET' ? body : undefined,
            },
          );
        },
      }),
    );
  }
}