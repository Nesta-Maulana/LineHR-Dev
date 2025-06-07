import { HttpException, HttpStatus } from '@nestjs/common';

export class ConflictException extends HttpException {
  constructor(message: string, conflictField?: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message,
        conflictField,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.CONFLICT,
    );
  }
}