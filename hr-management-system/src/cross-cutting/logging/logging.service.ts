import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class LoggingService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  log(message: string, context?: string, meta?: any): void {
    this.logger.info(message, { context, ...meta });
  }

  error(message: string, trace?: string, context?: string, meta?: any): void {
    this.logger.error(message, { context, trace, ...meta });
  }

  warn(message: string, context?: string, meta?: any): void {
    this.logger.warn(message, { context, ...meta });
  }

  debug(message: string, context?: string, meta?: any): void {
    this.logger.debug(message, { context, ...meta });
  }

  verbose(message: string, context?: string, meta?: any): void {
    this.logger.verbose(message, { context, ...meta });
  }

  logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
  ): void {
    this.logger.info('HTTP Request', {
      method,
      url,
      statusCode,
      responseTime,
      userId,
      context: 'HTTP',
    });
  }

  logDatabaseQuery(query: string, duration: number, parameters?: any[]): void {
    this.logger.debug('Database Query', {
      query,
      duration,
      parameters,
      context: 'Database',
    });
  }

  logBusinessEvent(event: string, details: any, userId?: string): void {
    this.logger.info('Business Event', {
      event,
      details,
      userId,
      context: 'Business',
    });
  }

  logSecurityEvent(event: string, details: any, userId?: string, ipAddress?: string): void {
    this.logger.warn('Security Event', {
      event,
      details,
      userId,
      ipAddress,
      context: 'Security',
    });
  }
}