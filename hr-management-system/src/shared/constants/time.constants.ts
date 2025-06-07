export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

export const CACHE_TTL = {
  SHORT: 5 * TIME.MINUTE,
  MEDIUM: 30 * TIME.MINUTE,
  LONG: 1 * TIME.HOUR,
  VERY_LONG: 24 * TIME.HOUR,
} as const;

export const TOKEN_EXPIRY = {
  ACCESS: '1h',
  REFRESH: '7d',
  EMAIL_VERIFICATION: '24h',
  PASSWORD_RESET: '1h',
} as const;