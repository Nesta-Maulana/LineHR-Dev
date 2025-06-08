import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1749318241 implements MigrationInterface {
    name = 'InitialSchema1749318241';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable UUID extension
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // Create custom types
        await queryRunner.query(`CREATE TYPE "user_status" AS ENUM ('active', 'inactive', 'suspended', 'pending')`);
        await queryRunner.query(`CREATE TYPE "employment_status" AS ENUM ('active', 'terminated', 'on_leave', 'probation')`);
        await queryRunner.query(`CREATE TYPE "leave_type" AS ENUM ('annual', 'sick', 'maternity', 'paternity', 'unpaid', 'other')`);
        await queryRunner.query(`CREATE TYPE "leave_status" AS ENUM ('pending', 'approved', 'rejected', 'cancelled')`);
        await queryRunner.query(`CREATE TYPE "audit_action" AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'access')`);

        // Create audit function
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql'
        `);

        // Create departments table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "departments" (
                "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                "name" VARCHAR(100) NOT NULL UNIQUE,
                "code" VARCHAR(20) NOT NULL UNIQUE,
                "description" TEXT,
                "parent_id" UUID,
                "manager_id" UUID,
                "is_active" BOOLEAN DEFAULT true,
                "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "created_by" UUID,
                "updated_by" UUID,
                CONSTRAINT "FK_departments_parent_id" FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE SET NULL
            )
        `);

        // Create roles table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "roles" (
                "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                "name" VARCHAR(50) NOT NULL UNIQUE,
                "code" VARCHAR(20) NOT NULL UNIQUE,
                "description" TEXT,
                "is_system" BOOLEAN DEFAULT false,
                "is_active" BOOLEAN DEFAULT true,
                "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create permissions table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "permissions" (
                "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                "resource" VARCHAR(50) NOT NULL,
                "action" VARCHAR(50) NOT NULL,
                "description" TEXT,
                "is_active" BOOLEAN DEFAULT true,
                "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "UQ_permissions_resource_action" UNIQUE("resource", "action")
            )
        `);

        // Create role_permissions junction table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "role_permissions" (
                "role_id" UUID NOT NULL,
                "permission_id" UUID NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id"),
                CONSTRAINT "FK_role_permissions_role_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_role_permissions_permission_id" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
            )
        `);

        // Create users table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "users" (
                "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                "email" VARCHAR(255) NOT NULL UNIQUE,
                "username" VARCHAR(50) NOT NULL UNIQUE,
                "password_hash" VARCHAR(255) NOT NULL,
                "first_name" VARCHAR(100) NOT NULL,
                "last_name" VARCHAR(100) NOT NULL,
                "middle_name" VARCHAR(100),
                "status" user_status DEFAULT 'pending',
                "email_verified" BOOLEAN DEFAULT false,
                "email_verification_token" VARCHAR(255),
                "password_reset_token" VARCHAR(255),
                "password_reset_expires" TIMESTAMP WITH TIME ZONE,
                "last_login_at" TIMESTAMP WITH TIME ZONE,
                "login_attempts" INTEGER DEFAULT 0,
                "locked_until" TIMESTAMP WITH TIME ZONE,
                "refresh_token" TEXT,
                "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "created_by" UUID,
                "updated_by" UUID
            )
        `);

        // Create employees table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "employees" (
                "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                "user_id" UUID NOT NULL UNIQUE,
                "employee_code" VARCHAR(50) NOT NULL UNIQUE,
                "department_id" UUID,
                "role_id" UUID,
                "reporting_to" UUID,
                "job_title" VARCHAR(100) NOT NULL,
                "employment_status" employment_status DEFAULT 'active',
                "hire_date" DATE NOT NULL,
                "probation_end_date" DATE,
                "termination_date" DATE,
                "birth_date" DATE,
                "gender" VARCHAR(20),
                "marital_status" VARCHAR(20),
                "nationality" VARCHAR(50),
                "phone_number" VARCHAR(20),
                "emergency_contact" JSONB,
                "address" JSONB,
                "bank_details" JSONB,
                "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "created_by" UUID,
                "updated_by" UUID,
                CONSTRAINT "FK_employees_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_employees_department_id" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL,
                CONSTRAINT "FK_employees_role_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL,
                CONSTRAINT "FK_employees_reporting_to" FOREIGN KEY ("reporting_to") REFERENCES "employees"("id") ON DELETE SET NULL
            )
        `);

        // Add foreign key constraint for departments.manager_id
        await queryRunner.query(`
            ALTER TABLE "departments" 
            ADD CONSTRAINT "FK_departments_manager_id" 
            FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL
        `);

        // Create audit_logs table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "audit_logs" (
                "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                "user_id" UUID,
                "action" audit_action NOT NULL,
                "resource" VARCHAR(100) NOT NULL,
                "resource_id" UUID,
                "details" JSONB,
                "ip_address" INET,
                "user_agent" TEXT,
                "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "FK_audit_logs_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        // Create sessions table for managing user sessions
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "sessions" (
                "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                "user_id" UUID NOT NULL,
                "token_hash" VARCHAR(255) NOT NULL UNIQUE,
                "ip_address" INET,
                "user_agent" TEXT,
                "is_active" BOOLEAN DEFAULT true,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "last_activity" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "FK_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // Create indexes for better performance
        await queryRunner.query(`CREATE INDEX "IDX_departments_parent_id" ON "departments" ("parent_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_departments_manager_id" ON "departments" ("manager_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_employees_user_id" ON "employees" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_employees_department_id" ON "employees" ("department_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_employees_reporting_to" ON "employees" ("reporting_to")`);
        await queryRunner.query(`CREATE INDEX "IDX_employees_employment_status" ON "employees" ("employment_status")`);
        await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
        await queryRunner.query(`CREATE INDEX "IDX_users_status" ON "users" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_user_id" ON "audit_logs" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("created_at")`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_resource" ON "audit_logs" ("resource", "resource_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_sessions_user_id" ON "sessions" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_sessions_token_hash" ON "sessions" ("token_hash")`);
        await queryRunner.query(`CREATE INDEX "IDX_sessions_expires_at" ON "sessions" ("expires_at")`);

        // Create triggers for updated_at
        await queryRunner.query(`
            CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON "departments"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);

        await queryRunner.query(`
            CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON "roles"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);

        await queryRunner.query(`
            CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON "permissions"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);

        await queryRunner.query(`
            CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);

        await queryRunner.query(`
            CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON "employees"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);

        // Insert default roles
        await queryRunner.query(`
            INSERT INTO "roles" ("name", "code", "description", "is_system") VALUES
            ('Super Admin', 'SUPER_ADMIN', 'Full system access', true),
            ('HR Admin', 'HR_ADMIN', 'HR department administrator', true),
            ('HR Manager', 'HR_MANAGER', 'HR department manager', true),
            ('Employee', 'EMPLOYEE', 'Regular employee', true),
            ('Manager', 'MANAGER', 'Department manager', true)
            ON CONFLICT ("code") DO NOTHING
        `);

        // Insert default permissions
        await queryRunner.query(`
            INSERT INTO "permissions" ("resource", "action", "description") VALUES
            -- User permissions
            ('users', 'create', 'Create new users'),
            ('users', 'read', 'View user details'),
            ('users', 'update', 'Update user information'),
            ('users', 'delete', 'Delete users'),
            ('users', 'list', 'List all users'),
            -- Employee permissions
            ('employees', 'create', 'Create new employees'),
            ('employees', 'read', 'View employee details'),
            ('employees', 'update', 'Update employee information'),
            ('employees', 'delete', 'Delete employees'),
            ('employees', 'list', 'List all employees'),
            -- Department permissions
            ('departments', 'create', 'Create new departments'),
            ('departments', 'read', 'View department details'),
            ('departments', 'update', 'Update department information'),
            ('departments', 'delete', 'Delete departments'),
            ('departments', 'list', 'List all departments'),
            -- Role permissions
            ('roles', 'create', 'Create new roles'),
            ('roles', 'read', 'View role details'),
            ('roles', 'update', 'Update role information'),
            ('roles', 'delete', 'Delete roles'),
            ('roles', 'list', 'List all roles'),
            -- Permission management
            ('permissions', 'manage', 'Manage permissions'),
            -- Audit logs
            ('audit', 'read', 'View audit logs'),
            ('audit', 'export', 'Export audit logs')
            ON CONFLICT ("resource", "action") DO NOTHING
        `);

        // Assign all permissions to Super Admin role
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r."id", p."id"
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE r."code" = 'SUPER_ADMIN'
            ON CONFLICT DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop triggers
        await queryRunner.query(`DROP TRIGGER IF EXISTS update_employees_updated_at ON "employees"`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS update_users_updated_at ON "users"`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS update_permissions_updated_at ON "permissions"`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS update_roles_updated_at ON "roles"`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS update_departments_updated_at ON "departments"`);

        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_expires_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_token_hash"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_user_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_resource"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_user_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_employees_employment_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_employees_reporting_to"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_employees_department_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_employees_user_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_departments_manager_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_departments_parent_id"`);

        // Drop tables in reverse order due to foreign key constraints
        await queryRunner.query(`DROP TABLE IF EXISTS "sessions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
        await queryRunner.query(`ALTER TABLE "departments" DROP CONSTRAINT IF EXISTS "FK_departments_manager_id"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "employees"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "departments"`);

        // Drop function
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column()`);

        // Drop custom types
        await queryRunner.query(`DROP TYPE IF EXISTS "audit_action"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "leave_status"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "leave_type"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "employment_status"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "user_status"`);
    }
}