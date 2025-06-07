import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../../persistence/entities/user.entity';
import { UserRepository } from '../../persistence/repositories/user.repository';
import { TokenPair } from '../interfaces/auth.interface';
import { JwtPayload, RefreshTokenPayload } from '@shared/types';
import { UnauthorizedException, BusinessException } from '@shared/exceptions';
import { HashUtil, DateUtil } from '@shared/utils';
import { MESSAGES, TOKEN_EXPIRY } from '@shared/constants';
import { randomUUID } from 'crypto';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {}

  async generateTokenPair(user: User): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: 'EMPLOYEE', // This will be dynamic when roles are implemented
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: TOKEN_EXPIRY.ACCESS,
    });

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tokenFamily: randomUUID(),
    };

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: TOKEN_EXPIRY.REFRESH,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getExpiresInSeconds(TOKEN_EXPIRY.ACCESS),
    };
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException(MESSAGES.AUTH.TOKEN_INVALID);
    }
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      return this.jwtService.verify<RefreshTokenPayload>(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException(MESSAGES.AUTH.TOKEN_INVALID);
    }
  }

  async generatePasswordResetToken(userId: string): Promise<string> {
    const token = HashUtil.generateToken(32);
    const hashedToken = HashUtil.hashToken(token);
    const expires = DateUtil.addHours(new Date(), 1);

    await this.userRepository.update(userId, {
      passwordResetToken: hashedToken,
      passwordResetExpires: expires,
    });

    return token;
  }

  async verifyPasswordResetToken(token: string): Promise<User> {
    const hashedToken = HashUtil.hashToken(token);
    const user = await this.userRepository.findByPasswordResetToken(hashedToken);

    if (!user) {
      throw new BusinessException(MESSAGES.AUTH.TOKEN_INVALID);
    }

    if (DateUtil.isExpired(user.passwordResetExpires)) {
      throw new BusinessException(MESSAGES.AUTH.TOKEN_EXPIRED);
    }

    return user;
  }

  async generateEmailVerificationToken(userId: string): Promise<string> {
    const token = HashUtil.generateToken(32);
    const hashedToken = HashUtil.hashToken(token);

    await this.userRepository.update(userId, {
      emailVerificationToken: hashedToken,
    });

    return token;
  }

  async verifyEmailVerificationToken(token: string): Promise<User> {
    const hashedToken = HashUtil.hashToken(token);
    const user = await this.userRepository.findByEmailVerificationToken(hashedToken);

    if (!user) {
      throw new BusinessException(MESSAGES.AUTH.TOKEN_INVALID);
    }

    return user;
  }

  private getExpiresInSeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // Default 1 hour

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  }
}