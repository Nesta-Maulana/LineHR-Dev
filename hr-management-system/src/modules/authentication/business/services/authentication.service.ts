import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from './user.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { AuthValidator } from '../validators/auth.validator';
import { LoginDto, RegisterDto } from '../../presentation/dto';
import { AuthResponse, TokenPair } from '../interfaces/auth.interface';
import { UnauthorizedException, BusinessException } from '@shared/exceptions';
import { UserStatus } from '@shared/enums';
import { HashUtil } from '@shared/utils';
import { MESSAGES } from '@shared/constants';
import { LoggingService } from '@cross-cutting/logging';
import { User } from '../../persistence/entities/user.entity';
import { UserRepository } from '../../persistence/repositories/user.repository';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly tokenService: TokenService,
    private readonly authValidator: AuthValidator,
    private readonly loggingService: LoggingService,
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string): Promise<AuthResponse> {
    // Validate registration data
    await this.authValidator.validateRegistration(dto);

    // Hash password
    const passwordHash = await HashUtil.hashPassword(
      dto.password,
      this.configService.get('BCRYPT_ROUNDS', 10),
    );

    // Create user
    const user = await this.userService.create({
      ...dto,
      passwordHash,
      status: UserStatus.PENDING,
      emailVerified: false,
    });

    // Generate verification token
    await this.tokenService.generateEmailVerificationToken(user.id);

    // Log registration event
    this.loggingService.logBusinessEvent('user_registered', {
      userId: user.id,
      email: user.email,
    });

    // Generate tokens and create session
    const tokens = await this.tokenService.generateTokenPair(user);
    await this.sessionService.createSession(user.id, tokens.refreshToken, ipAddress);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const user = await this.authValidator.validateLogin(dto);

    // Update login info
    await this.userService.updateLoginInfo(user.id, true);

    // Generate tokens
    const tokens = await this.tokenService.generateTokenPair(user);

    // Create session
    await this.sessionService.createSession(
      user.id,
      tokens.refreshToken,
      ipAddress,
      userAgent,
    );

    // Log login event
    this.loggingService.logSecurityEvent(
      'user_login',
      { userId: user.id, email: user.email },
      user.id,
      ipAddress,
    );

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async logout(userId: string, token: string): Promise<void> {
    await this.sessionService.invalidateSession(token);
    
    this.loggingService.logSecurityEvent(
      'user_logout',
      { userId },
      userId,
    );
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.sessionService.invalidateAllUserSessions(userId);
    
    this.loggingService.logSecurityEvent(
      'user_logout_all_devices',
      { userId },
      userId,
    );
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    
    const user = await this.userService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED);
    }

    // Rotate refresh token
    const newTokens = await this.tokenService.generateTokenPair(user);
    
    // Update session with new refresh token
    await this.sessionService.rotateRefreshToken(
      refreshToken,
      newTokens.refreshToken,
    );

    return newTokens;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED);
    }

    // Verify current password
    const isValidPassword = await HashUtil.comparePassword(
      currentPassword,
      user.passwordHash,
    );
    
    if (!isValidPassword) {
      throw new BusinessException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    // Validate new password
    await this.authValidator.validatePasswordStrength(newPassword);

    // Update password
    const newPasswordHash = await HashUtil.hashPassword(
      newPassword,
      this.configService.get('BCRYPT_ROUNDS', 10),
    );
    
    await this.userRepository.update(userId, {
      passwordHash: newPasswordHash,
    });

    // Invalidate all sessions except current
    await this.sessionService.invalidateAllUserSessions(userId);

    this.loggingService.logSecurityEvent(
      'password_changed',
      { userId },
      userId,
    );
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    await this.tokenService.generatePasswordResetToken(user.id);
    
    this.loggingService.logSecurityEvent(
      'password_reset_requested',
      { userId: user.id, email },
      user.id,
    );

    // TODO: Send email with reset token
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.tokenService.verifyPasswordResetToken(token);
    
    // Validate new password
    await this.authValidator.validatePasswordStrength(newPassword);

    // Update password
    const passwordHash = await HashUtil.hashPassword(
      newPassword,
      this.configService.get('BCRYPT_ROUNDS', 10),
    );
    
    await this.userRepository.update(user.id, {
      passwordHash,
      passwordResetToken: null as any,
      passwordResetExpires: null as any,
    });

    // Invalidate all sessions
    await this.sessionService.invalidateAllUserSessions(user.id);

    this.loggingService.logSecurityEvent(
      'password_reset_completed',
      { userId: user.id },
      user.id,
    );
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.tokenService.verifyEmailVerificationToken(token);
    
    await this.userRepository.update(user.id, {
      emailVerified: true,
      emailVerificationToken: null as any,
      status: UserStatus.ACTIVE,
    });

    this.loggingService.logBusinessEvent(
      'email_verified',
      { userId: user.id },
      user.id,
    );
  }

  private sanitizeUser(user: User): Partial<User> {
    const { passwordHash, refreshToken, ...sanitized } = user;
    return sanitized;
  }
}