import { registerAs } from '@nestjs/config';
import { RedisOptions } from 'ioredis';
import { EnvUtil } from '@shared/utils/env.util';

export default registerAs('redis', (): RedisOptions => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: EnvUtil.getInt('REDIS_PORT', 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  db: EnvUtil.getInt('REDIS_DB', 0),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
}));