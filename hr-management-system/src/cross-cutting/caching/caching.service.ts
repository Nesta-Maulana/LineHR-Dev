import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { LoggingService } from '../logging/logging.service';

@Injectable()
export class CachingService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly loggingService: LoggingService,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.loggingService.debug(`Cache hit: ${key}`, 'CachingService');
      } else {
        this.loggingService.debug(`Cache miss: ${key}`, 'CachingService');
      }
      return value;
    } catch (error) {
      this.loggingService.error(
        `Error getting cache key ${key}`,
        error.stack,
        'CachingService',
      );
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.loggingService.debug(`Cache set: ${key}`, 'CachingService');
    } catch (error) {
      this.loggingService.error(
        `Error setting cache key ${key}`,
        error.stack,
        'CachingService',
      );
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.loggingService.debug(`Cache deleted: ${key}`, 'CachingService');
    } catch (error) {
      this.loggingService.error(
        `Error deleting cache key ${key}`,
        error.stack,
        'CachingService',
      );
    }
  }

  async reset(): Promise<void> {
    try {
      await this.cacheManager.reset();
      this.loggingService.debug('Cache reset', 'CachingService');
    } catch (error) {
      this.loggingService.error(
        'Error resetting cache',
        error.stack,
        'CachingService',
      );
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.cacheManager.store.keys(`${pattern}*`);
      if (keys.length > 0) {
        await Promise.all(keys.map(key => this.cacheManager.del(key)));
        this.loggingService.debug(
          `Deleted ${keys.length} keys matching pattern: ${pattern}`,
          'CachingService',
        );
      }
    } catch (error) {
      this.loggingService.error(
        `Error deleting cache pattern ${pattern}`,
        error.stack,
        'CachingService',
      );
    }
  }

  generateKey(...parts: (string | number)[]): string {
    return parts.join(':');
  }
}