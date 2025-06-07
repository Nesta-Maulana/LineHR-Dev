import { PATTERNS } from '@shared/constants';

export class ValidationUtil {
  static isValidEmail(email: string): boolean {
    return PATTERNS.EMAIL.test(email);
  }

  static isValidPassword(password: string): boolean {
    return PATTERNS.PASSWORD.test(password);
  }

  static isValidPhone(phone: string, international: boolean = false): boolean {
    return international 
      ? PATTERNS.PHONE.INTERNATIONAL.test(phone)
      : PATTERNS.PHONE.US.test(phone);
  }

  static isValidUUID(uuid: string): boolean {
    return PATTERNS.UUID.test(uuid);
  }

  static isValidEmployeeCode(code: string): boolean {
    return PATTERNS.EMPLOYEE_CODE.test(code);
  }

  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  static isStrongPassword(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}