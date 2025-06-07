export interface JwtPayload {
  sub: string; // user id
  email: string;
  username: string;
  role: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenFamily: string;
  iat?: number;
  exp?: number;
}