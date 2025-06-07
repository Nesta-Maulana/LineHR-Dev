import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { PATTERNS } from '@shared/constants';

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    return PATTERNS.PASSWORD.test(password);
  }

  defaultMessage(): string {
    return 'Password must be at least 8 characters long and contain uppercase, lowercase, number and special character';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isEmployeeCode', async: false })
export class IsEmployeeCodeConstraint implements ValidatorConstraintInterface {
  validate(code: string): boolean {
    return PATTERNS.EMPLOYEE_CODE.test(code);
  }

  defaultMessage(): string {
    return 'Employee code must be in format EMP-XXXXXX';
  }
}

export function IsEmployeeCode(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsEmployeeCodeConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isPhoneNumber', async: false })
export class IsPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(phone: string, args: ValidationArguments): boolean {
    const [international] = args.constraints;
    return international
      ? PATTERNS.PHONE.INTERNATIONAL.test(phone)
      : PATTERNS.PHONE.US.test(phone);
  }

  defaultMessage(args: ValidationArguments): string {
    const [international] = args.constraints;
    return international
      ? 'Phone number must be in international format (+1234567890)'
      : 'Phone number must be in US format';
  }
}

export function IsPhoneNumber(
  international: boolean = false,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [international],
      validator: IsPhoneNumberConstraint,
    });
  };
}