import { Injectable } from '@nestjs/common';
import { SessionRepository } from '../../persistence/repositories/session.repository';
import { Session } from '../../persistence/entities/session.entity';
import { HashUtil, DateUtil } from '@shared/utils';
import { UnauthorizedException } from '@shared/exceptions';
import { MESSAGES } from '@shared/constants';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly configService: ConfigService,
  ) {}

  async createSession(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Session> {
    const tokenHash = HashUtil.hashToken(refreshToken);
    
    const expiresAt = DateUtil.addDays(
      new Date(),
      this.configService.get('SESSION_EXPIRY_DAYS', 7),
    );

    return await this.sessionRepository.create({
      userId,
      tokenHash,
      ipAddress,
      userAgent,
      expiresAt,
      isActive: true,
    });
  }

  async validateSession(token: string): Promise<Session> {
    const tokenHash = HashUtil.hashToken(token);
    const session = await this.sessionRepository.findByTokenHash(tokenHash);

    if (!session || !session.isValid) {
      throw new UnauthorizedException(MESSAGES.AUTH.TOKEN_INVALID);
    }

    // Update last activity
    await this.sessionRepository.updateLastActivity(session.id);

    return session;
  }

  async invalidateSession(token: string): Promise<void> {
    const tokenHash = HashUtil.hashToken(token);
    const session = await this.sessionRepository.findByTokenHash(tokenHash);

    if (session) {
      await this.sessionRepository.deactivate(session.id);
    }
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    await this.sessionRepository.deactivateAllUserSessions(userId);
  }

  async rotateRefreshToken(
    oldToken: string,
    newToken: string,
  ): Promise<void> {
    const oldTokenHash = HashUtil.hashToken(oldToken);
    const session = await this.sessionRepository.findByTokenHash(oldTokenHash);

    if (!session) {
      throw new UnauthorizedException(MESSAGES.AUTH.TOKEN_INVALID);
    }

    // Deactivate old session
    await this.sessionRepository.deactivate(session.id);

    // Create new session with same metadata
    await this.createSession(
      session.userId,
      newToken,
      session.ipAddress,
      session.userAgent,
    );
  }

  async getActiveSessions(userId: string): Promise<Session[]> {
    return await this.sessionRepository.findActiveByUserId(userId);
  }

  async cleanupExpiredSessions(): Promise<number> {
    return await this.sessionRepository.deleteExpiredSessions();
  }

  async countActiveSessions(userId: string): Promise<number> {
    return await this.sessionRepository.countActiveSessions(userId);
  }
}