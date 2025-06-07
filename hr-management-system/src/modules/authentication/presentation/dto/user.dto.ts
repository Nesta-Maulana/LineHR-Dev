import {
  IsEmail,
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { UserStatus } from '@shared/enums';
import { RegisterDto } from './register.dto';

export class CreateUserDto extends RegisterDto {
  @ApiProperty({
    description: 'User status',
    enum: UserStatus,
    default: UserStatus.PENDING,
    required: false,
  })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @ApiProperty({
    description: 'Email verification status',
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  emailVerified?: boolean;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;
}