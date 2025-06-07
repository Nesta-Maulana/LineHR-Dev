# Module Template for Layered Architecture

This template provides the structure for creating new modules following the strict layered architecture pattern.

## Module Structure

```
src/modules/{module-name}/
├── {module-name}.module.ts
├── presentation/               # Layer 1 - Presentation Layer
│   ├── controllers/           # HTTP controllers
│   ├── dto/                   # Data Transfer Objects
│   ├── guards/                # Route guards
│   ├── interceptors/          # Request/response interceptors
│   ├── pipes/                 # Validation pipes
│   └── decorators/            # Custom decorators
├── business/                   # Layer 2 - Business Logic Layer
│   ├── services/              # Business services
│   ├── interfaces/            # Business interfaces
│   ├── validators/            # Business validation
│   ├── exceptions/            # Business exceptions
│   └── models/                # Business models/aggregates
└── persistence/                # Layer 3 - Data Access Layer
    ├── entities/              # Database entities
    ├── repositories/          # Data repositories
    ├── migrations/            # Database migrations
    └── seeds/                 # Initial data seeds
```

## Layer Communication Rules

1. **Presentation Layer → Business Logic Layer only**
2. **Business Logic Layer → Data Access Layer only**
3. **Cross-cutting concerns can be used by any layer**
4. **No skip-layer dependencies allowed**
5. **All dependencies injected through interfaces**

## Example Module Creation Steps

### 1. Create Module File
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { YourEntity } from './persistence/entities/your.entity';

// Repositories
import { YourRepository } from './persistence/repositories/your.repository';

// Services
import { YourService } from './business/services/your.service';
import { YourBusinessService } from './business/services/your-business.service';

// Controllers
import { YourController } from './presentation/controllers/your.controller';

// Validators
import { YourValidator } from './business/validators/your.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([YourEntity]),
  ],
  controllers: [YourController],
  providers: [
    // Repositories
    YourRepository,
    
    // Services
    YourService,
    YourBusinessService,
    
    // Validators
    YourValidator,
  ],
  exports: [YourService],
})
export class YourModule {}
```

### 2. Create Entity (Persistence Layer)
```typescript
import { Entity, Column } from 'typeorm';
import { AuditableEntity } from '@shared/entities';

@Entity('your_table')
export class YourEntity extends AuditableEntity {
  @Column()
  name: string;
  
  // Add your columns here
}
```

### 3. Create Repository (Persistence Layer)
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { YourEntity } from '../entities/your.entity';

@Injectable()
export class YourRepository {
  constructor(
    @InjectRepository(YourEntity)
    private readonly repository: Repository<YourEntity>,
  ) {}
  
  // Add repository methods
}
```

### 4. Create Service (Business Layer)
```typescript
import { Injectable } from '@nestjs/common';
import { YourRepository } from '../../persistence/repositories/your.repository';
import { YourValidator } from '../validators/your.validator';

@Injectable()
export class YourService {
  constructor(
    private readonly repository: YourRepository,
    private readonly validator: YourValidator,
  ) {}
  
  // Add business logic methods
}
```

### 5. Create DTOs (Presentation Layer)
```typescript
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateYourDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

### 6. Create Controller (Presentation Layer)
```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { YourService } from '../../business/services/your.service';
import { CreateYourDto } from '../dto/create-your.dto';
import { JwtAuthGuard } from '@cross-cutting/security';

@ApiTags('Your Module')
@Controller('your-route')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class YourController {
  constructor(private readonly yourService: YourService) {}
  
  @Post()
  @ApiOperation({ summary: 'Create new item' })
  async create(@Body() dto: CreateYourDto) {
    return await this.yourService.create(dto);
  }
}
```

## Best Practices

1. **Keep layers independent**: Each layer should only know about the layer directly below it
2. **Use DTOs for data transfer**: Never expose entities directly through controllers
3. **Validate at boundaries**: Input validation in presentation layer, business rules in business layer
4. **Handle exceptions appropriately**: Use custom exceptions for business logic errors
5. **Log important operations**: Use LoggingService for audit trail
6. **Cache when appropriate**: Use CachingService for frequently accessed data
7. **Follow naming conventions**: Use consistent naming across all modules
8. **Write tests for each layer**: Unit tests for services, integration tests for controllers
9. **Document your API**: Use Swagger decorators for comprehensive API documentation
10. **Use transactions**: Ensure data consistency with database transactions