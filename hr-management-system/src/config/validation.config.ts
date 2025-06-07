import { ValidationPipeOptions } from '@nestjs/common';

export const validationConfig: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  validateCustomDecorators: true,
  errorHttpStatusCode: 422,
  exceptionFactory: (errors) => {
    const formattedErrors = errors.reduce((acc, error) => {
      const constraints = error.constraints || {};
      acc[error.property] = Object.values(constraints);
      return acc;
    }, {});
    
    return {
      statusCode: 422,
      message: 'Validation failed',
      errors: formattedErrors,
    };
  },
};