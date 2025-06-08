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
        error instanceof Error ? error.stack : String(error),
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
        error instanceof Error ? error.stack : String(error),
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
        error instanceof Error ? error.stack : String(error),
        'CachingService',
      );
    }
  }

  async reset(): Promise<void> {
    try {
      // The reset method is not available in all cache stores
      // We'll try to clear all keys instead
      const store = this.cacheManager.store as any;
      if (store && typeof store.clear === 'function') {
        await store.clear();
      } else if (store && typeof store.reset === 'function') {
        await store.reset();
      } else {
        // Fallback: do nothing if neither method is available
        this.loggingService.warn(
          'Cache reset not supported by current cache store',
          'CachingService',
        );
      }
      this.loggingService.debug('Cache reset', 'CachingService');
    } catch (error) {
      this.loggingService.error(
        'Error resetting cache',
        error instanceof Error ? error.stack : String(error),
        'CachingService',
      );
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      // Pattern deletion is not supported by all cache stores
      const store = this.cacheManager.store as any;
      if (store && typeof store.keys === 'function') {
        const keys = await store.keys(`${pattern}*`);
        if (keys.length > 0) {
          await Promise.all(keys.map((key: string) => this.cacheManager.del(key)));
          this.loggingService.debug(
            `Deleted ${keys.length} keys matching pattern: ${pattern}`,
            'CachingService',
          );
        }
      } else {
        this.loggingService.warn(
          'Pattern deletion not supported by current cache store',
          'CachingService',
        );
      }
    } catch (error) {
      this.loggingService.error(
        `Error deleting cache pattern ${pattern}`,
        error instanceof Error ? error.stack : String(error),
        'CachingService',
      );
    }
  }

  generateKey(...parts: (string | number)[]): string {
    return parts.join(':');
  }
}