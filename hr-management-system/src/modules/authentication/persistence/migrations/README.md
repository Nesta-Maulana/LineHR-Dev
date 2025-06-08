# Database Migrations

This directory contains TypeORM migrations for the HR Management System.

## Migration Files

1. **1749318241-InitialSchema.ts**
   - Creates the initial database schema
   - Sets up all tables, indexes, triggers, and custom types
   - Establishes foreign key relationships
   - Creates the `update_updated_at_column()` function for automatic timestamp updates

2. **1749318331-SeedInitialData.ts**
   - Seeds initial roles (Super Admin, HR Admin, HR Manager, Employee, Manager)
   - Seeds initial permissions for all resources
   - Assigns appropriate permissions to each role

## Running Migrations

### Using TypeORM CLI

```bash
# Run all pending migrations
npm run typeorm migration:run

# Revert the last migration
npm run typeorm migration:revert

# Show all migrations and their status
npm run typeorm migration:show

# Generate a new migration based on entity changes
npm run typeorm migration:generate -- -n MigrationName
```

### Using the DataSource directly

```bash
# Run migrations
npx typeorm-ts-node-commonjs migration:run -d ./ormconfig.ts

# Revert migrations
npx typeorm-ts-node-commonjs migration:revert -d ./ormconfig.ts
```

## Creating New Migrations

1. To create a new empty migration:
```bash
npm run typeorm migration:create -- -n YourMigrationName
```

2. To generate a migration from entity changes:
```bash
npm run typeorm migration:generate -- -n YourMigrationName
```

## Migration Best Practices

1. **Naming Convention**: Use timestamp prefix followed by descriptive name (e.g., `1234567890-AddUserTable.ts`)
2. **Atomic Operations**: Each migration should be atomic and reversible
3. **Data Migrations**: Keep schema and data migrations separate when possible
4. **Testing**: Always test migrations in a development environment first
5. **Documentation**: Document complex migrations with comments

## Database Schema Overview

The migration creates the following tables:

- **users**: User authentication and profile information
- **employees**: Employee-specific information linked to users
- **departments**: Organizational structure with hierarchical support
- **roles**: System and custom roles for access control
- **permissions**: Granular permissions for resources and actions
- **role_permissions**: Many-to-many relationship between roles and permissions
- **sessions**: Active user sessions for security
- **audit_logs**: Comprehensive audit trail for all system actions

## Custom Types

The migrations create these PostgreSQL custom types:

- `user_status`: 'active', 'inactive', 'suspended', 'pending'
- `employment_status`: 'active', 'terminated', 'on_leave', 'probation'
- `leave_type`: 'annual', 'sick', 'maternity', 'paternity', 'unpaid', 'other'
- `leave_status`: 'pending', 'approved', 'rejected', 'cancelled'
- `audit_action`: 'create', 'update', 'delete', 'login', 'logout', 'access'

## Triggers

The migrations set up automatic `updated_at` timestamp updates for:
- departments
- roles
- permissions
- users
- employees