import { registerAs } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export default registerAs('jwt', (): JwtModuleOptions => ({
  secret: process.env.JWT_SECRET || 'default-secret-change-this',
  signOptions: {
    expiresIn: process.env.JWT_EXPIRATION || '1h',
    issuer: 'hr-management-system',
    audience: 'hr-management-users',
  },
}));

export const jwtConstants = {
  accessTokenSecret: process.env.JWT_SECRET || 'default-secret-change-this',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-this',
  accessTokenExpiration: process.env.JWT_EXPIRATION || '1h',
  refreshTokenExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
};