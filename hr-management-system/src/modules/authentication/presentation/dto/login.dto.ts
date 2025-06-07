import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email or username',
    example: 'john.doe@example.com',
  })
  @IsString()
  @IsNotEmpty()
  emailOrUsername: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecureP@ssw0rd!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}