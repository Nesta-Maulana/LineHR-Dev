import { IsString, IsNotEmpty, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '@cross-cutting/validation';

export class RequestPasswordResetDto {
  @ApiProperty({
    description: 'Email address to send reset link',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token',
    example: 'abcd1234...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'New password',
    example: 'NewSecureP@ssw0rd!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @IsStrongPassword()
  password: string;

  @ApiProperty({
    description: 'Confirm new password',
    example: 'NewSecureP@ssw0rd!',
  })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token',
    example: 'abcd1234...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}