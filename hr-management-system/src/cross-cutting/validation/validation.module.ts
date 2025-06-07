import { Module, Global } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { validationConfig } from '@config/validation.config';

@Global()
@Module({
  providers: [
    {
      provide: APP_PIPE,
      useFactory: () => new ValidationPipe(validationConfig),
    },
  ],
})
export class ValidationModule {}