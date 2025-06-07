import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '@cross-cutting/validation';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'CurrentP@ssw0rd!',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    description: 'New password',
    example: 'NewSecureP@ssw0rd!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @IsStrongPassword()
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password',
    example: 'NewSecureP@ssw0rd!',
  })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}