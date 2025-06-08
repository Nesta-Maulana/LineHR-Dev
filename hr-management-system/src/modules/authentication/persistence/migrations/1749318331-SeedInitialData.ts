import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedInitialData1749318331 implements MigrationInterface {
    name = 'SeedInitialData1749318331';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Insert default roles if they don't exist
        await queryRunner.query(`
            INSERT INTO "roles" ("name", "code", "description", "is_system") VALUES
            ('Super Admin', 'SUPER_ADMIN', 'Full system access', true),
            ('HR Admin', 'HR_ADMIN', 'HR department administrator', true),
            ('HR Manager', 'HR_MANAGER', 'HR department manager', true),
            ('Employee', 'EMPLOYEE', 'Regular employee', true),
            ('Manager', 'MANAGER', 'Department manager', true)
            ON CONFLICT ("code") DO NOTHING
        `);

        // Insert default permissions if they don't exist
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
            ('audit', 'export', 'Export audit logs'),
            -- Session management
            ('sessions', 'list', 'List all sessions'),
            ('sessions', 'revoke', 'Revoke user sessions'),
            -- Reports
            ('reports', 'generate', 'Generate reports'),
            ('reports', 'view', 'View reports'),
            -- Settings
            ('settings', 'manage', 'Manage system settings')
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

        // Assign HR-related permissions to HR Admin role
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r."id", p."id"
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE r."code" = 'HR_ADMIN'
            AND (
                (p."resource" IN ('users', 'employees', 'departments', 'roles') AND p."action" IN ('create', 'read', 'update', 'delete', 'list'))
                OR (p."resource" = 'audit' AND p."action" IN ('read', 'export'))
                OR (p."resource" = 'reports' AND p."action" IN ('generate', 'view'))
                OR (p."resource" = 'sessions' AND p."action" IN ('list', 'revoke'))
            )
            ON CONFLICT DO NOTHING
        `);

        // Assign HR-related permissions to HR Manager role (limited compared to HR Admin)
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r."id", p."id"
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE r."code" = 'HR_MANAGER'
            AND (
                (p."resource" IN ('users', 'employees', 'departments') AND p."action" IN ('read', 'update', 'list'))
                OR (p."resource" = 'employees' AND p."action" = 'create')
                OR (p."resource" = 'reports' AND p."action" = 'view')
            )
            ON CONFLICT DO NOTHING
        `);

        // Assign basic permissions to Employee role
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r."id", p."id"
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE r."code" = 'EMPLOYEE'
            AND (
                (p."resource" = 'users' AND p."action" = 'read')
                OR (p."resource" = 'employees' AND p."action" = 'read')
            )
            ON CONFLICT DO NOTHING
        `);

        // Assign department management permissions to Manager role
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r."id", p."id"
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE r."code" = 'MANAGER'
            AND (
                (p."resource" IN ('employees', 'departments') AND p."action" IN ('read', 'list'))
                OR (p."resource" = 'employees' AND p."action" = 'update')
                OR (p."resource" = 'reports' AND p."action" = 'view')
            )
            ON CONFLICT DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove role-permission associations
        await queryRunner.query(`
            DELETE FROM "role_permissions"
            WHERE "role_id" IN (
                SELECT "id" FROM "roles" 
                WHERE "code" IN ('SUPER_ADMIN', 'HR_ADMIN', 'HR_MANAGER', 'EMPLOYEE', 'MANAGER')
            )
        `);

        // Remove seeded permissions
        await queryRunner.query(`
            DELETE FROM "permissions"
            WHERE ("resource", "action") IN (
                ('sessions', 'list'),
                ('sessions', 'revoke'),
                ('reports', 'generate'),
                ('reports', 'view'),
                ('settings', 'manage')
            )
        `);
    }
}