import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  role: string;
  permissions?: string[];
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface RefreshTokenRequest extends Request {
  user: AuthenticatedUser & {
    refreshToken: string;
  };
}