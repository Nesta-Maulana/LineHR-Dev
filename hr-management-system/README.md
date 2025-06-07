# HR Management System

A comprehensive HR Management System built with NestJS following strict Layered Architecture principles.

## 🏗️ Architecture

This project implements a strict layered architecture with the following layers:

1. **Presentation Layer** - Controllers, DTOs, Guards, Interceptors
2. **Business Logic Layer** - Services, Validators, Business Rules
3. **Data Access Layer** - Entities, Repositories, Migrations

### Layer Communication Rules
- Presentation Layer → Business Logic Layer only
- Business Logic Layer → Data Access Layer only
- Cross-cutting concerns can be used by any layer
- No skip-layer dependencies allowed

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (RBAC)
  - Permission-based authorization
  - Session management
  - Password reset functionality

- **User Management**
  - User registration and profile management
  - Email verification
  - Account activation/deactivation

- **Cross-cutting Concerns**
  - Structured logging with Winston
  - Redis caching
  - Request rate limiting
  - Health checks and monitoring
  - Global exception handling
  - Request/response validation

- **API Documentation**
  - Swagger/OpenAPI documentation
  - Interactive API explorer

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- Redis (v7 or higher)
- Docker & Docker Compose (optional)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hr-management-system
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration

## 🐳 Running with Docker

1. Start all services:
```bash
npm run docker:up
```

2. View logs:
```bash
npm run docker:logs
```

3. Stop services:
```bash
npm run docker:down
```

## 💻 Running without Docker

1. Ensure PostgreSQL and Redis are running

2. Run database migrations:
```bash
npm run migration:run
```

3. Start the application:
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## 📚 API Documentation

Once the application is running, access the Swagger documentation at:
```
http://localhost:3000/api-docs
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📝 Database

### Running Migrations

```bash
# Generate a new migration
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Seeding Data

```bash
npm run seed:run
```

## 🔧 Scripts

- `npm run start:dev` - Start in development mode with hot-reload
- `npm run build` - Build the application
- `npm run start:prod` - Start in production mode
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run unit tests
- `npm run docker:up` - Start Docker containers
- `npm run docker:down` - Stop Docker containers

## 📁 Project Structure

```
src/
├── shared/                     # Shared utilities across all modules
│   ├── constants/             # Application constants
│   ├── enums/                 # Shared enumerations
│   ├── types/                 # TypeScript type definitions
│   ├── exceptions/            # Custom exceptions
│   ├── utils/                 # Utility functions
│   ├── entities/              # Base entity classes
│   └── base/                  # Base classes
├── cross-cutting/             # Cross-cutting concerns
│   ├── logging/              # Logging configuration
│   ├── caching/              # Redis caching
│   ├── security/             # Security guards and decorators
│   ├── validation/           # Custom validators
│   ├── monitoring/           # Health checks
│   └── filters/              # Exception filters
├── modules/                   # Business modules
│   ├── authentication/       # Authentication module
│   ├── employees/            # Employee management
│   ├── departments/          # Department management
│   ├── permissions/          # Permission management
│   └── audit/                # Audit trail
└── config/                    # Configuration files
```

## 🔐 Environment Variables

Key environment variables (see `.env.example` for full list):

- `NODE_ENV` - Environment (development/production)
- `APP_PORT` - Application port
- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port
- `DB_USERNAME` - PostgreSQL username
- `DB_PASSWORD` - PostgreSQL password
- `DB_DATABASE` - PostgreSQL database name
- `JWT_SECRET` - JWT secret key
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port

## 🤝 Contributing

1. Follow the existing code structure and conventions
2. Ensure all tests pass
3. Update documentation as needed
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.