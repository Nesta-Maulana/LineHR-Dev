import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

// Configuration
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';

// Cross-cutting modules
import { LoggingModule, LoggingInterceptor } from './cross-cutting/logging';
import { CachingModule } from './cross-cutting/caching';
import { SecurityModule } from './cross-cutting/security';
import { ValidationModule } from './cross-cutting/validation';
import { MonitoringModule } from './cross-cutting/monitoring';

// Business modules
import { AuthenticationModule } from './modules/authentication/authentication.module';

// Global exception filter
import { AllExceptionsFilter } from './cross-cutting/filters/all-exceptions.filter';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig],
      envFilePath: '.env',
    }),
    
    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        if (!dbConfig) {
          throw new Error('Database configuration not found');
        }
        return dbConfig;
      },
    }),
    
    // Cross-cutting concerns
    LoggingModule,
    CachingModule,
    SecurityModule,
    ValidationModule,
    MonitoringModule,
    
    // Business modules
    AuthenticationModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}