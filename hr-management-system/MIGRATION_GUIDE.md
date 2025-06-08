# Migration Guide for HR Management System

## Overview

This guide provides instructions for setting up and managing the database migrations for the HR Management System.

## Prerequisites

1. PostgreSQL 12+ installed and running
2. Node.js 18+ and npm installed
3. TypeORM CLI available via npm scripts

## Initial Setup

1. **Copy environment variables**
   ```bash
   cp .env.example .env
   ```

2. **Update the `.env` file** with your database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=hr_user
   DB_PASSWORD=hr_password
   DB_DATABASE=hr_management
   ```

3. **Create the database** (if it doesn't exist):
   ```sql
   CREATE DATABASE hr_management;
   CREATE USER hr_user WITH PASSWORD 'hr_password';
   GRANT ALL PRIVILEGES ON DATABASE hr_management TO hr_user;
   ```

## Running Migrations

### First Time Setup

Run all migrations to set up the initial database schema:

```bash
npm run migration:run
```

This will:
1. Create all necessary tables, indexes, and triggers
2. Set up custom PostgreSQL types
3. Seed initial roles and permissions

### Checking Migration Status

To see which migrations have been run:

```bash
npm run migration:show
# or
npm run migration:check
```

### Reverting Migrations

To revert the last executed migration:

```bash
npm run migration:revert
```

## Migration Files

The system includes two main migration files:

### 1. InitialSchema Migration
- Location: `src/modules/authentication/persistence/migrations/1749318241-InitialSchema.ts`
- Creates all database tables with proper relationships
- Sets up custom types and triggers
- Establishes indexes for performance

### 2. SeedInitialData Migration
- Location: `src/modules/authentication/persistence/migrations/1749318331-SeedInitialData.ts`
- Seeds default roles: Super Admin, HR Admin, HR Manager, Employee, Manager
- Seeds permissions for all resources
- Assigns permissions to roles

## Database Schema

The migrations create the following structure:

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   users     │────▶│  employees  │────▶│ departments  │
└─────────────┘     └─────────────┘     └──────────────┘
       │                    │                    │
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  sessions   │     │    roles    │────▶│ permissions  │
└─────────────┘     └─────────────┘     └──────────────┘
       │                                         │
       │                                         │
       ▼                                         ▼
┌─────────────┐                         ┌──────────────┐
│ audit_logs  │                         │role_permissions│
└─────────────┘                         └──────────────┘
```

## Creating New Migrations

### Generate from Entity Changes

If you modify entity files:

```bash
npm run migration:generate -- -n DescriptiveName
```

### Create Empty Migration

For custom migrations:

```bash
npm run migration:create -- -n DescriptiveName
```

### Migration Template

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class YourMigrationName1234567890 implements MigrationInterface {
    name = 'YourMigrationName1234567890';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Forward migration logic
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Rollback logic
    }
}
```

## Best Practices

1. **Always test migrations** in a development environment first
2. **Back up your database** before running migrations in production
3. **Review generated migrations** before running them
4. **Keep migrations atomic** - one logical change per migration
5. **Document complex migrations** with comments
6. **Never modify** already executed migrations

## Troubleshooting

### Migration fails with "relation already exists"

This usually means the database already has some tables. Either:
- Drop and recreate the database (development only)
- Manually sync the migrations table

### Cannot connect to database

Check:
- PostgreSQL is running
- Database credentials in `.env` are correct
- Database exists and user has permissions

### Migration not found

Ensure:
- Migration files are in the correct directory
- TypeScript compilation is successful
- Migration class is properly exported

## Production Deployment

1. **Set production environment**:
   ```bash
   NODE_ENV=production
   ```

2. **Run migrations**:
   ```bash
   npm run migration:run
   ```

3. **Verify status**:
   ```bash
   npm run migration:check
   ```

## Additional Resources

- [TypeORM Migrations Documentation](https://typeorm.io/migrations)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- Project-specific migration files in `src/modules/authentication/persistence/migrations/`