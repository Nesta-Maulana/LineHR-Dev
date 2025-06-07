export const MESSAGES = {
  AUTH: {
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCOUNT_LOCKED: 'Account is locked due to multiple failed login attempts',
    ACCOUNT_INACTIVE: 'Account is inactive',
    EMAIL_NOT_VERIFIED: 'Please verify your email address',
    TOKEN_INVALID: 'Invalid or expired token',
    TOKEN_EXPIRED: 'Token has expired',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    PASSWORD_RESET_SUCCESS: 'Password reset successful',
    PASSWORD_RESET_EMAIL_SENT: 'Password reset email sent',
  },
  
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Invalid email format',
    INVALID_PHONE: 'Invalid phone number format',
    INVALID_DATE: 'Invalid date format',
    INVALID_UUID: 'Invalid UUID format',
    MIN_LENGTH: 'Minimum length is {length} characters',
    MAX_LENGTH: 'Maximum length is {length} characters',
    PASSWORD_WEAK: 'Password must be at least 8 characters with uppercase, lowercase, number and special character',
  },
  
  CRUD: {
    CREATE_SUCCESS: '{entity} created successfully',
    UPDATE_SUCCESS: '{entity} updated successfully',
    DELETE_SUCCESS: '{entity} deleted successfully',
    NOT_FOUND: '{entity} not found',
    ALREADY_EXISTS: '{entity} already exists',
    OPERATION_FAILED: 'Operation failed',
  },
  
  ERROR: {
    INTERNAL_SERVER: 'Internal server error',
    BAD_REQUEST: 'Bad request',
    NOT_FOUND: 'Resource not found',
    CONFLICT: 'Resource conflict',
    UNPROCESSABLE_ENTITY: 'Unprocessable entity',
    TOO_MANY_REQUESTS: 'Too many requests',
  },
} as const;