import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { User } from './persistence/entities/user.entity';
import { Session } from './persistence/entities/session.entity';

// Repositories
import { UserRepository } from './persistence/repositories/user.repository';
import { SessionRepository } from './persistence/repositories/session.repository';

// Services
import { AuthenticationService } from './business/services/authentication.service';
import { UserService } from './business/services/user.service';
import { SessionService } from './business/services/session.service';
import { TokenService } from './business/services/token.service';

// Controllers
import { AuthController } from './presentation/controllers/auth.controller';
import { UserController } from './presentation/controllers/user.controller';

// Strategies
import { JwtStrategy } from './business/strategies/jwt.strategy';
import { JwtRefreshStrategy } from './business/strategies/jwt-refresh.strategy';

// Validators
import { AuthValidator } from './business/validators/auth.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION', '1h'),
        },
      }),
    }),
  ],
  controllers: [AuthController, UserController],
  providers: [
    // Repositories
    UserRepository,
    SessionRepository,
    
    // Services
    AuthenticationService,
    UserService,
    SessionService,
    TokenService,
    
    // Strategies
    JwtStrategy,
    JwtRefreshStrategy,
    
    // Validators
    AuthValidator,
  ],
  exports: [
    UserService,
    SessionService,
    JwtModule,
  ],
})
export class AuthenticationModule {}