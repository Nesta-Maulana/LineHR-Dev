import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../persistence/repositories/user.repository';
import { User } from '../../persistence/entities/user.entity';
import { CreateUserDto, UpdateUserDto } from '../../presentation/dto';
import { ResourceNotFoundException, ConflictException } from '@shared/exceptions';
import { PaginationQuery, PaginatedResult } from '@shared/types';
import { UserStatus } from '@shared/enums';
import { CachingService } from '@cross-cutting/caching';
import { CACHE_TTL } from '@shared/constants';

@Injectable()
export class UserService {
  private readonly CACHE_PREFIX = 'user';

  constructor(
    private readonly userRepository: UserRepository,
    private readonly cachingService: CachingService,
  ) {}

  async create(data: CreateUserDto | Partial<User>): Promise<User> {
    // Check if email already exists
    if (data.email && await this.userRepository.emailExists(data.email)) {
      throw new ConflictException(
        'Email already exists',
        'email',
      );
    }

    // Check if username already exists
    if (data.username && await this.userRepository.usernameExists(data.username)) {
      throw new ConflictException(
        'Username already exists',
        'username',
      );
    }

    const user = await this.userRepository.create(data);
    
    // Invalidate cache
    await this.invalidateUserCache(user.id);
    
    return user;
  }

  async findById(id: string): Promise<User | null> {
    const cacheKey = this.cachingService.generateKey(this.CACHE_PREFIX, id);
    
    // Check cache first
    const cached = await this.cachingService.get<User>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.userRepository.findById(id);
    
    if (user) {
      await this.cachingService.set(cacheKey, user, CACHE_TTL.MEDIUM);
    }
    
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findByUsername(username);
  }

  async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    return await this.userRepository.findByEmailOrUsername(emailOrUsername);
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new ResourceNotFoundException('User', id);
    }

    // Check email uniqueness if changing
    if (data.email && data.email !== user.email) {
      if (await this.userRepository.emailExists(data.email, id)) {
        throw new ConflictException(
          'Email already exists',
          'email',
        );
      }
    }

    // Check username uniqueness if changing
    if (data.username && data.username !== user.username) {
      if (await this.userRepository.usernameExists(data.username, id)) {
        throw new ConflictException(
          'Username already exists',
          'username',
        );
      }
    }

    const updatedUser = await this.userRepository.update(id, data);
    
    // Invalidate cache
    await this.invalidateUserCache(id);
    
    return updatedUser;
  }

  async updateLoginInfo(
    id: string,
    success: boolean,
  ): Promise<void> {
    await this.userRepository.updateLoginInfo(id, success);
    await this.invalidateUserCache(id);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new ResourceNotFoundException('User', id);
    }

    await this.userRepository.delete(id);
    await this.invalidateUserCache(id);
  }

  async findAll(
    query: PaginationQuery,
    filters?: {
      status?: UserStatus;
      emailVerified?: boolean;
    },
  ): Promise<PaginatedResult<User>> {
    return await this.userRepository.findAll(query, filters);
  }

  async activate(id: string): Promise<User> {
    return await this.update(id, { status: UserStatus.ACTIVE });
  }

  async deactivate(id: string): Promise<User> {
    return await this.update(id, { status: UserStatus.INACTIVE });
  }

  async suspend(id: string): Promise<User> {
    return await this.update(id, { status: UserStatus.SUSPENDED });
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    const cacheKey = this.cachingService.generateKey(this.CACHE_PREFIX, userId);
    await this.cachingService.delete(cacheKey);
  }
}