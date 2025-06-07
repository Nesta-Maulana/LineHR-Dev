import { Injectable } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { LoginDto, RegisterDto } from '../../presentation/dto';
import { User } from '../../persistence/entities/user.entity';
import { UnauthorizedException, BusinessException, ValidationException } from '@shared/exceptions';
import { HashUtil, ValidationUtil } from '@shared/utils';
import { MESSAGES } from '@shared/constants';
import { UserStatus } from '@shared/enums';

@Injectable()
export class AuthValidator {
  constructor(private readonly userService: UserService) {}

  async validateRegistration(dto: RegisterDto): Promise<void> {
    const errors: Record<string, string[]> = {};

    // Validate email format
    if (!ValidationUtil.isValidEmail(dto.email)) {
      errors.email = [MESSAGES.VALIDATION.INVALID_EMAIL];
    }

    // Check if email already exists
    const emailExists = await this.userService.findByEmail(dto.email);
    if (emailExists) {
      errors.email = [...(errors.email || []), 'Email already registered'];
    }

    // Check if username already exists
    const usernameExists = await this.userService.findByUsername(dto.username);
    if (usernameExists) {
      errors.username = ['Username already taken'];
    }

    // Validate password strength
    await this.validatePasswordStrength(dto.password);

    if (Object.keys(errors).length > 0) {
      throw new ValidationException(errors);
    }
  }

  async validateLogin(dto: LoginDto): Promise<User> {
    const user = await this.userService.findByEmailOrUsername(dto.emailOrUsername);
    
    if (!user) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    // Check if account is locked
    if (user.isLocked) {
      throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_LOCKED);
    }

    // Verify password
    const isValidPassword = await HashUtil.comparePassword(
      dto.password,
      user.passwordHash,
    );
    
    if (!isValidPassword) {
      // Update failed login attempts
      await this.userService.updateLoginInfo(user.id, false);
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    // Check account status
    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_INACTIVE);
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account has been suspended');
    }

    // Check email verification
    if (!user.emailVerified && user.status === UserStatus.PENDING) {
      throw new UnauthorizedException(MESSAGES.AUTH.EMAIL_NOT_VERIFIED);
    }

    return user;
  }

  async validatePasswordStrength(password: string): Promise<void> {
    const validation = ValidationUtil.isStrongPassword(password);
    
    if (!validation.isValid) {
      throw new ValidationException({
        password: validation.errors,
      });
    }
  }

  async validatePasswordMatch(password: string, confirmPassword: string): Promise<void> {
    if (password !== confirmPassword) {
      throw new ValidationException({
        confirmPassword: ['Passwords do not match'],
      });
    }
  }
}