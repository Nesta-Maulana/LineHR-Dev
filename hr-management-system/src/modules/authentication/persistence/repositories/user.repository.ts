import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserStatus } from '@shared/enums';
import { PaginationQuery, PaginatedResult } from '@shared/types';
import { PaginationUtil } from '@shared/utils';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    const user = this.repository.create(data);
    return await this.repository.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { username: username.toLowerCase() },
    });
  }

  async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    const normalizedInput = emailOrUsername.toLowerCase();
    return await this.repository.findOne({
      where: [
        { email: normalizedInput },
        { username: normalizedInput },
      ],
    });
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    return await this.repository.findOne({
      where: {
        passwordResetToken: token,
      },
    });
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    return await this.repository.findOne({
      where: {
        emailVerificationToken: token,
      },
    });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.repository.update(id, data);
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found after update');
    }
    return user;
  }

  async updateLoginInfo(
    id: string,
    success: boolean,
  ): Promise<void> {
    const user = await this.findById(id);
    if (!user) return;

    if (success) {
      await this.repository.update(id, {
        lastLoginAt: new Date(),
        loginAttempts: 0,
        lockedUntil: null as any,
      });
    } else {
      const attempts = user.loginAttempts + 1;
      const updates: Partial<User> = { loginAttempts: attempts };

      // Lock account after 5 failed attempts
      if (attempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }

      await this.repository.update(id, updates);
    }
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findAll(
    query: PaginationQuery,
    filters?: {
      status?: UserStatus;
      emailVerified?: boolean;
    },
  ): Promise<PaginatedResult<User>> {
    const { page, limit } = PaginationUtil.normalizeQuery(query);
    const skip = PaginationUtil.getSkip(page, limit);

    const queryBuilder = this.repository.createQueryBuilder('user');

    if (filters?.status) {
      queryBuilder.andWhere('user.status = :status', { status: filters.status });
    }

    if (filters?.emailVerified !== undefined) {
      queryBuilder.andWhere('user.emailVerified = :emailVerified', {
        emailVerified: filters.emailVerified,
      });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(user.email ILIKE :search OR user.username ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [data, total] = await queryBuilder
      .orderBy('user.createdAt', query.sortOrder || 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: PaginationUtil.getMeta(total, page, limit),
    };
  }

  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('user')
      .where('user.email = :email', { email: email.toLowerCase() });

    if (excludeId) {
      query.andWhere('user.id != :id', { id: excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  async usernameExists(username: string, excludeId?: string): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('user')
      .where('user.username = :username', { username: username.toLowerCase() });

    if (excludeId) {
      query.andWhere('user.id != :id', { id: excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}