import { registerAs } from '@nestjs/config';
import { EnvUtil } from '@shared/utils/env.util';

export default registerAs('app', () => ({
  environment: process.env.NODE_ENV || 'development',
  port: EnvUtil.getInt('APP_PORT', 3000),
  name: process.env.APP_NAME || 'HR Management System',
  version: process.env.APP_VERSION || '1.0.0',
  
  cors: {
    enabled: true,
    origin: process.env.CORS_ORIGIN?.split(',') || true,
    credentials: true,
  },

  throttle: {
    ttl: EnvUtil.getInt('RATE_LIMIT_TTL', 60),
    limit: EnvUtil.getInt('RATE_LIMIT_MAX', 100),
  },

  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
    path: process.env.SWAGGER_PATH || 'api-docs',
    title: 'HR Management System API',
    description: 'Comprehensive HR Management System API Documentation',
    version: process.env.APP_VERSION || '1.0.0',
  },

  security: {
    bcryptRounds: EnvUtil.getInt('BCRYPT_ROUNDS', 10),
  },

  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    healthCheckTimeout: EnvUtil.getInt('HEALTH_CHECK_TIMEOUT', 5000),
  },
}));