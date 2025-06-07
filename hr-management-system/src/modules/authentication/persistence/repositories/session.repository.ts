import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Session } from '../entities/session.entity';

@Injectable()
export class SessionRepository {
  constructor(
    @InjectRepository(Session)
    private readonly repository: Repository<Session>,
  ) {}

  async create(data: Partial<Session>): Promise<Session> {
    const session = this.repository.create(data);
    return await this.repository.save(session);
  }

  async findById(id: string): Promise<Session | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    return await this.repository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    return await this.repository.find({
      where: {
        userId,
        isActive: true,
        expiresAt: LessThan(new Date()),
      },
      order: {
        lastActivity: 'DESC',
      },
    });
  }

  async updateLastActivity(id: string): Promise<void> {
    await this.repository.update(id, {
      lastActivity: new Date(),
    });
  }

  async deactivate(id: string): Promise<void> {
    await this.repository.update(id, {
      isActive: false,
    });
  }

  async deactivateAllUserSessions(userId: string): Promise<void> {
    await this.repository.update(
      { userId },
      { isActive: false },
    );
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = await this.repository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected || 0;
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }

  async countActiveSessions(userId: string): Promise<number> {
    return await this.repository.count({
      where: {
        userId,
        isActive: true,
        expiresAt: LessThan(new Date()),
      },
    });
  }
}