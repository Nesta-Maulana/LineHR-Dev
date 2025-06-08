import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
import { CachingService } from './caching.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisOptions = {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
        };
        
        const redisUrl = redisOptions.password 
          ? `redis://:${redisOptions.password}@${redisOptions.host}:${redisOptions.port}/${redisOptions.db}`
          : `redis://${redisOptions.host}:${redisOptions.port}/${redisOptions.db}`;
        
        const keyvRedis = new KeyvRedis(redisUrl);
        
        return {
          stores: [new Keyv({ store: keyvRedis })],
          ttl: configService.get('REDIS_TTL', 3600) * 1000, // Convert to milliseconds
        };
      },
    }),
  ],
  providers: [CachingService],
  exports: [CachingService, CacheModule],
})
export class CachingModule {}