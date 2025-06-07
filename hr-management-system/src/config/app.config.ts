import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.APP_PORT, 10) || 3000,
  name: process.env.APP_NAME || 'HR Management System',
  version: process.env.APP_VERSION || '1.0.0',
  
  cors: {
    enabled: true,
    origin: process.env.CORS_ORIGIN?.split(',') || true,
    credentials: true,
  },

  throttle: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60,
    limit: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },

  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
    path: process.env.SWAGGER_PATH || 'api-docs',
    title: 'HR Management System API',
    description: 'Comprehensive HR Management System API Documentation',
    version: process.env.APP_VERSION || '1.0.0',
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
  },

  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    healthCheckTimeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT, 10) || 5000,
  },
}));