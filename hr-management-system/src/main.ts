import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { validationConfig } from './config/validation.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get config service
  const configService = app.get(ConfigService);
  
  // Use Winston logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  
  // Set global prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/live', 'health/ready'],
  });
  
  // Enable CORS
  const corsConfig = configService.get('app.cors');
  app.enableCors(corsConfig);
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe(validationConfig));
  
  // Swagger documentation
  const swaggerConfig = configService.get('app.swagger');
  if (swaggerConfig.enabled) {
    const config = new DocumentBuilder()
      .setTitle(swaggerConfig.title)
      .setDescription(swaggerConfig.description)
      .setVersion(swaggerConfig.version)
      .addBearerAuth()
      .addTag('Authentication', 'User authentication endpoints')
      .addTag('Users', 'User management endpoints')
      .addTag('Employees', 'Employee management endpoints')
      .addTag('Departments', 'Department management endpoints')
      .addTag('Permissions', 'Permission management endpoints')
      .addTag('Audit', 'Audit trail endpoints')
      .addTag('Health', 'Health check endpoints')
      .build();
      
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(swaggerConfig.path, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }
  
  // Start server
  const port = configService.get('app.port', 3000);
  await app.listen(port);
  
  console.log(`
  🚀 Application is running on: http://localhost:${port}
  📚 API Documentation: http://localhost:${port}/${swaggerConfig.path}
  🏥 Health Check: http://localhost:${port}/health
  `);
}

bootstrap().catch(err => {
  console.error('Failed to start application:', err);
  process.exit(1);
});