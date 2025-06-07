-- ============================================================================
-- POSTGRESQL HR DATABASE dengan SIMPLIFIED AUDIT LOGGING (FULLY CORRECTED)
-- ============================================================================
-- 
-- Philosophy: Focus on practical user activity tracking without over-engineering
-- Design Pattern: Clean, maintainable, and performance-optimized for business needs
-- 
-- Core Features:
-- - User activity tracking (login, logout, data changes)
-- - Role-based access control dengan fine-grained permissions
-- - Dynamic menu management
-- - Basic employee management
-- - Simple but effective audit trail with proper partitioning
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CUSTOM TYPES untuk konsistensi dan reusability
-- ============================================================================

-- User status enumeration
CREATE TYPE user_status AS ENUM (
    'active', 
    'inactive', 
    'suspended', 
    'locked', 
    'pending_verification'
);

-- Audit action types untuk tracking user activities  
CREATE TYPE audit_action AS ENUM (
    'LOGIN',
    'LOGOUT', 
    'CREATE',
    'UPDATE',
    'DELETE',
    'VIEW',
    'PERMISSION_CHANGE',
    'PASSWORD_CHANGE'
);

-- Permission action types
CREATE TYPE permission_action AS ENUM (
    'create',
    'read', 
    'update',
    'delete',
    'execute',
    'approve',
    'export'
);

-- Role types untuk classification
CREATE TYPE role_type AS ENUM (
    'system',
    'functional', 
    'departmental',
    'project',
    'temporary'
);

-- Menu types untuk navigation
CREATE TYPE menu_type AS ENUM (
    'page',
    'action', 
    'separator',
    'external_link',
    'submenu'
);

-- Employment types
CREATE TYPE employment_type AS ENUM (
    'permanent',
    'contract',
    'probation', 
    'intern',
    'consultant'
);

-- Employment status
CREATE TYPE employment_status AS ENUM (
    'active',
    'inactive', 
    'terminated',
    'resigned',
    'retired'
);

-- ============================================================================
-- FOUNDATION: ORGANIZATIONS (Multi-tenant support)
-- ============================================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic organization information
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url VARCHAR(500),
    
    -- Localization settings - important untuk Indonesian market
    timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
    locale VARCHAR(10) DEFAULT 'id_ID',
    currency VARCHAR(3) DEFAULT 'IDR',
    
    -- System configuration stored as JSON untuk flexibility
    settings JSONB DEFAULT '{}',
    
    -- Subscription information
    subscription_plan VARCHAR(20) DEFAULT 'basic',
    subscription_status VARCHAR(20) DEFAULT 'active',
    subscription_expires_at DATE,
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexing untuk performance - organizational queries akan frequent
    CONSTRAINT organizations_slug_check CHECK (LENGTH(slug) >= 3)
);

-- Index untuk common query patterns
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_active ON organizations(is_active);
CREATE INDEX idx_organizations_subscription ON organizations(subscription_status, subscription_expires_at);

-- ============================================================================
-- CORE: USERS dengan enhanced authentication support
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic identification - email adalah primary identifier
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified_at TIMESTAMP,
    phone VARCHAR(20),
    phone_verified_at TIMESTAMP,
    
    -- Authentication credentials
    password_hash VARCHAR(255), -- Bcrypt hash
    password_changed_at TIMESTAMP,
    requires_password_change BOOLEAN DEFAULT FALSE,
    
    -- External authentication untuk modern auth flows
    line_user_id VARCHAR(100) UNIQUE, -- LINE integration untuk Indonesian market
    google_id VARCHAR(100) UNIQUE,
    microsoft_id VARCHAR(100) UNIQUE,
    oauth_providers JSONB, -- Array of available OAuth providers
    
    -- Security settings - simplified but effective
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(100), -- TOTP secret
    
    -- Account status dan security tracking
    status user_status DEFAULT 'pending_verification',
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    last_login_at TIMESTAMP,
    last_login_ip INET, -- PostgreSQL native IP address type
    
    -- Profile information
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(255),
    avatar_url VARCHAR(500),
    
    -- User preferences untuk better UX
    language VARCHAR(5) DEFAULT 'id',
    timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
    ui_preferences JSONB DEFAULT '{}', -- Theme, layout preferences, etc.
    notification_settings JSONB DEFAULT '{}', -- Notification preferences
    
    -- Performance optimization - cache frequently accessed permissions
    cached_permissions JSONB,
    permissions_cache_expires_at TIMESTAMP,
    
    -- System metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP, -- Soft delete pattern
    
    -- Audit tracking - who created/modified this user
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Constraints untuk data integrity
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_phone_format CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$')
);

-- Comprehensive indexing strategy untuk user table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_last_login ON users(last_login_at);
CREATE INDEX idx_users_line_id ON users(line_user_id) WHERE line_user_id IS NOT NULL;
CREATE INDEX idx_users_permissions_cache ON users(permissions_cache_expires_at) WHERE permissions_cache_expires_at IS NOT NULL;
CREATE INDEX idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NULL; -- Partial index untuk active users
CREATE INDEX idx_users_oauth ON users USING GIN(oauth_providers); -- GIN index untuk JSONB searches

-- ============================================================================
-- SIMPLIFIED AUDIT LOGGING - Focus on user activities (CORRECTED PARTITIONING)
-- ============================================================================

-- Create the parent table as PARTITIONED by month based on created_at
CREATE TABLE audit_logs (
    id BIGSERIAL, -- Remove PRIMARY KEY constraint for partitioned table
    
    -- Core identification
    user_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    session_id VARCHAR(128), -- Track user session untuk correlation
    
    -- Action details - what happened
    action audit_action NOT NULL,
    table_name VARCHAR(100) NOT NULL, -- Which table was affected
    record_id VARCHAR(100) NOT NULL, -- Primary key of affected record
    
    -- Change tracking - simplified but sufficient
    old_values JSONB, -- Previous data state
    new_values JSONB, -- New data state
    changed_fields TEXT[], -- Array of changed field names
    
    -- Request context untuk debugging dan analysis
    ip_address INET,
    user_agent TEXT,
    request_url VARCHAR(1000),
    
    -- Business context
    description TEXT, -- Human-readable description of what happened
    
    -- Temporal information dengan high precision
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP, -- Millisecond precision
    
    -- Simple integrity check
    checksum VARCHAR(64), -- SHA-256 hash for basic tamper detection
    
    -- Constraint for the partition key
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for current and upcoming months
CREATE TABLE audit_logs_y2024m12 PARTITION OF audit_logs
FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

CREATE TABLE audit_logs_y2025m01 PARTITION OF audit_logs  
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE audit_logs_y2025m02 PARTITION OF audit_logs  
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE audit_logs_y2025m03 PARTITION OF audit_logs  
FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE audit_logs_y2025m04 PARTITION OF audit_logs  
FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

CREATE TABLE audit_logs_y2025m05 PARTITION OF audit_logs  
FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

CREATE TABLE audit_logs_y2025m06 PARTITION OF audit_logs  
FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE TABLE audit_logs_y2025m07 PARTITION OF audit_logs  
FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');

CREATE TABLE audit_logs_y2025m08 PARTITION OF audit_logs  
FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE audit_logs_y2025m09 PARTITION OF audit_logs  
FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

CREATE TABLE audit_logs_y2025m10 PARTITION OF audit_logs  
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE audit_logs_y2025m11 PARTITION OF audit_logs  
FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE audit_logs_y2025m12 PARTITION OF audit_logs  
FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Efficient indexing untuk audit queries - most common patterns
CREATE INDEX idx_audit_user_time ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_action_time ON audit_logs(action, created_at);
CREATE INDEX idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_session ON audit_logs(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);

-- ============================================================================
-- MENU SYSTEM - Dynamic navigation management
-- ============================================================================

CREATE TABLE menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES menus(id) ON DELETE CASCADE,
    
    -- Menu identification
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL, -- System code untuk application reference
    
    -- Display properties
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100), -- Icon class or reference
    route_path VARCHAR(500), -- Frontend routing path
    
    -- Menu behavior
    menu_type menu_type DEFAULT 'page',
    sort_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    requires_permission BOOLEAN DEFAULT TRUE,
    
    -- System properties
    is_system_menu BOOLEAN DEFAULT FALSE, -- Cannot be deleted
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT menus_org_code_unique UNIQUE (organization_id, code),
    CONSTRAINT menus_org_slug_unique UNIQUE (organization_id, slug)
);

-- Menu indexing untuk hierarchy queries dan navigation
CREATE INDEX idx_menus_org ON menus(organization_id);
CREATE INDEX idx_menus_parent ON menus(parent_id);
CREATE INDEX idx_menus_active ON menus(is_active, is_visible);
CREATE INDEX idx_menus_sort ON menus(sort_order);
CREATE INDEX idx_menus_code ON menus(code);

-- ============================================================================
-- PERMISSIONS SYSTEM - Granular access control
-- ============================================================================

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Permission identification
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL, -- e.g., 'employee.create', 'payroll.read'
    category VARCHAR(100) NOT NULL, -- Grouping: 'employee', 'payroll', 'attendance'
    
    -- Permission details
    description TEXT,
    action_type permission_action NOT NULL,
    
    -- System classification
    is_system_permission BOOLEAN DEFAULT FALSE,
    is_dangerous BOOLEAN DEFAULT FALSE, -- Requires confirmation
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    CONSTRAINT permissions_org_code_unique UNIQUE (organization_id, code)
);

-- Permission indexing
CREATE INDEX idx_permissions_org ON permissions(organization_id);
CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_permissions_action ON permissions(action_type);
CREATE INDEX idx_permissions_code ON permissions(code);

-- ============================================================================
-- ROLES SYSTEM - Hierarchical dengan inheritance
-- ============================================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Role identification
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Hierarchy
    level INTEGER NOT NULL, -- 1 = highest authority
    role_type role_type DEFAULT 'functional',
    
    -- Role properties
    is_active BOOLEAN DEFAULT TRUE,
    is_system_role BOOLEAN DEFAULT FALSE, -- Cannot be modified
    is_default_role BOOLEAN DEFAULT FALSE, -- Auto-assigned to new users
    max_users INTEGER, -- Maximum users yang dapat memiliki role ini
    
    -- Inheritance
    inherits_from_role_id UUID REFERENCES roles(id),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    CONSTRAINT roles_org_slug_unique UNIQUE (organization_id, slug)
);

-- Role indexing
CREATE INDEX idx_roles_org ON roles(organization_id);
CREATE INDEX idx_roles_slug ON roles(slug);
CREATE INDEX idx_roles_level ON roles(level);
CREATE INDEX idx_roles_active ON roles(is_active);
CREATE INDEX idx_roles_inheritance ON roles(inherits_from_role_id) WHERE inherits_from_role_id IS NOT NULL;

-- ============================================================================
-- MENU-PERMISSION RELATIONSHIPS
-- ============================================================================

CREATE TABLE menu_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    
    -- Permission requirement
    is_required BOOLEAN DEFAULT TRUE,
    permission_level VARCHAR(20) DEFAULT 'view', -- 'view', 'interact', 'modify', 'admin'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    CONSTRAINT menu_permissions_unique UNIQUE (menu_id, permission_id)
);

CREATE INDEX idx_menu_permissions_menu ON menu_permissions(menu_id);
CREATE INDEX idx_menu_permissions_permission ON menu_permissions(permission_id);

-- ============================================================================
-- ROLE-PERMISSION ASSIGNMENTS
-- ============================================================================

CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    
    -- Grant details
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Scope limitations stored as JSON untuk flexibility
    conditions JSONB DEFAULT '{}',
    restrictions JSONB DEFAULT '{}',
    
    -- Validity period
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    
    -- Inheritance tracking
    is_inherited BOOLEAN DEFAULT FALSE,
    inherited_from_role_id UUID REFERENCES roles(id),
    
    CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX idx_role_permissions_validity ON role_permissions(valid_from, valid_until);
CREATE INDEX idx_role_permissions_inherited ON role_permissions(is_inherited);

-- ============================================================================
-- USER-ROLE ASSIGNMENTS with scope limitations
-- ============================================================================

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    
    -- Scope untuk multi-tenant dan departmental access
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    department_id UUID, -- Will reference departments table
    
    -- Assignment details
    assigned_by UUID NOT NULL REFERENCES users(id),
    assignment_reason TEXT,
    
    -- Validity
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT user_roles_unique UNIQUE (user_id, role_id, organization_id, department_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_org ON user_roles(organization_id);
CREATE INDEX idx_user_roles_active ON user_roles(is_active);
CREATE INDEX idx_user_roles_validity ON user_roles(valid_from, valid_until);

-- ============================================================================
-- USER PERMISSION OVERRIDES - Fine-grained access control
-- ============================================================================

CREATE TABLE user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    
    -- Override behavior
    override_type VARCHAR(20) NOT NULL, -- 'grant', 'revoke', 'modify'
    override_actions JSONB, -- Modified actions untuk user
    
    -- Business justification
    business_justification TEXT NOT NULL,
    granted_by UUID NOT NULL REFERENCES users(id),
    
    -- Validity
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Usage tracking untuk audit
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT user_permission_overrides_unique UNIQUE (user_id, permission_id),
    CONSTRAINT override_type_check CHECK (override_type IN ('grant', 'revoke', 'modify'))
);

CREATE INDEX idx_user_overrides_user ON user_permission_overrides(user_id);
CREATE INDEX idx_user_overrides_permission ON user_permission_overrides(permission_id);
CREATE INDEX idx_user_overrides_active ON user_permission_overrides(is_active);
CREATE INDEX idx_user_overrides_validity ON user_permission_overrides(valid_from, valid_until);

-- ============================================================================
-- COMPUTED USER MENU ACCESS - Performance optimization table
-- ============================================================================

CREATE TABLE user_menu_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    
    -- Computed permissions - granular CRUD access
    can_view BOOLEAN DEFAULT FALSE,
    can_create BOOLEAN DEFAULT FALSE,
    can_read BOOLEAN DEFAULT FALSE,
    can_update BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_execute BOOLEAN DEFAULT FALSE,
    can_approve BOOLEAN DEFAULT FALSE,
    can_export BOOLEAN DEFAULT FALSE,
    
    -- Access derivation tracking untuk audit dan debugging
    access_source JSONB, -- Track dari mana permission ini berasal
    
    -- Cache management
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- Cache expiration
    
    CONSTRAINT user_menu_access_unique UNIQUE (user_id, menu_id)
);

CREATE INDEX idx_user_menu_access_user ON user_menu_access(user_id);
CREATE INDEX idx_user_menu_access_menu ON user_menu_access(menu_id);
CREATE INDEX idx_user_menu_access_expires ON user_menu_access(expires_at);
CREATE INDEX idx_user_menu_access_permissions ON user_menu_access(can_view, can_create, can_read, can_update, can_delete);

-- ============================================================================
-- ORGANIZATIONAL STRUCTURE
-- ============================================================================

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    
    -- Department identification
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    
    -- Leadership
    head_id UUID, -- Will reference employees
    
    -- Financial information
    cost_center VARCHAR(50),
    budget_annual DECIMAL(15,2),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_departments_org ON departments(organization_id);
CREATE INDEX idx_departments_parent ON departments(parent_id);
CREATE INDEX idx_departments_active ON departments(is_active);
CREATE INDEX idx_departments_head ON departments(head_id) WHERE head_id IS NOT NULL;

-- ============================================================================
-- JOB POSITIONS
-- ============================================================================

CREATE TABLE job_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id),
    
    -- Position details
    title VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    
    -- Hierarchy
    grade_level INTEGER,
    min_salary DECIMAL(15,2),
    max_salary DECIMAL(15,2),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_job_positions_org ON job_positions(organization_id);
CREATE INDEX idx_job_positions_dept ON job_positions(department_id);
CREATE INDEX idx_job_positions_active ON job_positions(is_active);

-- ============================================================================
-- EMPLOYEES - Comprehensive employee management
-- ============================================================================

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Employee identification
    employee_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Personal information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20),
    
    -- Contact information
    personal_email VARCHAR(255),
    personal_phone VARCHAR(20),
    current_address JSONB,
    
    -- Emergency contact
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    
    -- Employment information
    job_position_id UUID REFERENCES job_positions(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    direct_manager_id UUID REFERENCES employees(id),
    
    -- Employment details
    employment_type employment_type NOT NULL,
    employment_status employment_status DEFAULT 'active',
    hire_date DATE NOT NULL,
    termination_date DATE,
    
    -- Compensation
    base_salary DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'IDR',
    
    -- System metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_employees_user ON employees(user_id);
CREATE INDEX idx_employees_org ON employees(organization_id);
CREATE INDEX idx_employees_number ON employees(employee_number);
CREATE INDEX idx_employees_dept ON employees(department_id);
CREATE INDEX idx_employees_manager ON employees(direct_manager_id) WHERE direct_manager_id IS NOT NULL;
CREATE INDEX idx_employees_status ON employees(employment_status);
CREATE INDEX idx_employees_deleted ON employees(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- AUDIT FUNCTIONS - Corrected with proper syntax and error handling
-- ============================================================================

-- Function untuk generate audit checksum menggunakan explicit dollar quoting
CREATE OR REPLACE FUNCTION generate_audit_checksum()
RETURNS TRIGGER AS $audit_checksum$
BEGIN
    -- Generate a SHA-256 checksum for basic audit trail integrity
    -- This helps detect if audit records have been tampered with
    NEW.checksum := encode(
        digest(
            COALESCE(NEW.table_name, '') || 
            COALESCE(NEW.record_id, '') || 
            COALESCE(NEW.new_values::text, '') || 
            COALESCE(NEW.user_id::text, '') || 
            NEW.created_at::text, 
            'sha256'
        ), 
        'hex'
    );
    RETURN NEW;
END;
$audit_checksum$ LANGUAGE plpgsql;

-- Function untuk automatic partition creation dengan proper error handling
CREATE OR REPLACE FUNCTION create_monthly_audit_partition()
RETURNS TRIGGER AS $audit_partition$
DECLARE
    partition_date DATE;
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
    sql_statement TEXT;
BEGIN
    -- Extract the month from the new record's created_at timestamp
    partition_date := DATE_TRUNC('month', NEW.created_at);
    partition_name := 'audit_logs_y' || TO_CHAR(partition_date, 'YYYY') || 'm' || TO_CHAR(partition_date, 'MM');
    start_date := partition_date;
    end_date := partition_date + INTERVAL '1 month';
    
    -- Check if partition already exists to avoid duplicate creation
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = partition_name 
        AND n.nspname = current_schema()
    ) THEN
        -- Dynamically create the partition table
        sql_statement := FORMAT(
            'CREATE TABLE %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',
            partition_name, 
            start_date, 
            end_date
        );
        
        EXECUTE sql_statement;
        
        -- Create performance indexes on the new partition
        EXECUTE FORMAT('CREATE INDEX %I ON %I(user_id, created_at)', 
                      'idx_' || partition_name || '_user_time', partition_name);
        EXECUTE FORMAT('CREATE INDEX %I ON %I(action, created_at)', 
                      'idx_' || partition_name || '_action_time', partition_name);
        EXECUTE FORMAT('CREATE INDEX %I ON %I(table_name, record_id)', 
                      'idx_' || partition_name || '_table_record', partition_name);
    END IF;
    
    RETURN NEW;
END;
$audit_partition$ LANGUAGE plpgsql;

-- Generic audit function dengan enhanced error handling dan safe type operations
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $audit_changes$
DECLARE
    action_type audit_action;
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[];
    user_for_audit UUID;
    org_for_audit UUID;
    record_id_for_audit TEXT;
BEGIN
    -- Step 1: Determine the type of operation and convert records to JSONB safely
    IF TG_OP = 'INSERT' THEN
        action_type := 'CREATE';
        old_data := NULL;
        new_data := to_jsonb(NEW);
        changed_fields := NULL;
        
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'UPDATE';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
        -- Calculate which fields actually changed by comparing JSONB objects
        -- This is more reliable than comparing individual fields
        SELECT ARRAY_AGG(key) INTO changed_fields
        FROM (
            -- Fields that exist in old but not in new (removed or changed)
            SELECT key FROM jsonb_each(old_data)
            WHERE NOT (new_data ? key AND old_data->>key = new_data->>key)
            UNION
            -- Fields that exist in new but not in old (added or changed)  
            SELECT key FROM jsonb_each(new_data)
            WHERE NOT (old_data ? key AND old_data->>key = new_data->>key)
        ) AS changed_data;
        
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'DELETE';
        old_data := to_jsonb(OLD);
        new_data := NULL;
        changed_fields := NULL;
    END IF;
    
    -- Step 2: Safely extract user information for audit trail
    -- This handles cases where tables might not have these fields
    IF TG_OP = 'DELETE' THEN
        user_for_audit := COALESCE(
            CASE WHEN old_data ? 'updated_by' THEN (old_data->>'updated_by')::UUID ELSE NULL END,
            CASE WHEN old_data ? 'created_by' THEN (old_data->>'created_by')::UUID ELSE NULL END
        );
        org_for_audit := CASE WHEN old_data ? 'organization_id' THEN (old_data->>'organization_id')::UUID ELSE NULL END;
        record_id_for_audit := CASE WHEN old_data ? 'id' THEN (old_data->>'id') ELSE 'unknown' END;
    ELSE
        user_for_audit := COALESCE(
            CASE WHEN new_data ? 'updated_by' THEN (new_data->>'updated_by')::UUID ELSE NULL END,
            CASE WHEN new_data ? 'created_by' THEN (new_data->>'created_by')::UUID ELSE NULL END,
            CASE WHEN old_data IS NOT NULL AND old_data ? 'updated_by' THEN (old_data->>'updated_by')::UUID ELSE NULL END,
            CASE WHEN old_data IS NOT NULL AND old_data ? 'created_by' THEN (old_data->>'created_by')::UUID ELSE NULL END
        );
        org_for_audit := CASE WHEN new_data ? 'organization_id' THEN (new_data->>'organization_id')::UUID ELSE NULL END;
        record_id_for_audit := CASE WHEN new_data ? 'id' THEN (new_data->>'id') ELSE 'unknown' END;
    END IF;
    
    -- Step 3: Insert the audit record with all gathered information
    INSERT INTO audit_logs (
        user_id,
        organization_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        changed_fields,
        description
    ) VALUES (
        user_for_audit,
        org_for_audit,
        action_type,
        TG_TABLE_NAME,
        record_id_for_audit,
        old_data,
        new_data,
        changed_fields,
        TG_OP || ' operation on ' || TG_TABLE_NAME
    );
    
    -- Return the appropriate record based on the operation type
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    
EXCEPTION WHEN OTHERS THEN
    -- If audit logging fails, don't fail the original operation
    -- Just log the error and continue
    RAISE WARNING 'Audit logging failed for table %: %', TG_TABLE_NAME, SQLERRM;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$audit_changes$ LANGUAGE plpgsql;

-- ============================================================================
-- PERMISSION MANAGEMENT FUNCTIONS - Enhanced with proper error handling
-- ============================================================================

-- Function untuk refresh user menu access cache dengan comprehensive error handling
CREATE OR REPLACE FUNCTION refresh_user_menu_access(target_user_id UUID)
RETURNS VOID AS $refresh_access$
DECLARE
    menu_record RECORD;
    computed_permissions JSONB;
    access_sources JSONB;
    user_org_id UUID;
BEGIN
    -- First, get the user's organization to limit menu scope
    SELECT e.organization_id INTO user_org_id
    FROM employees e 
    JOIN users u ON u.id = e.user_id 
    WHERE u.id = target_user_id
    LIMIT 1;
    
    -- If user is not an employee, skip cache refresh
    IF user_org_id IS NULL THEN
        RAISE NOTICE 'User % is not associated with any organization. Skipping menu access cache.', target_user_id;
        RETURN;
    END IF;
    
    -- Clear existing cache for this user
    DELETE FROM user_menu_access WHERE user_id = target_user_id;
    
    -- Iterate through all active menus for the user's organization
    FOR menu_record IN 
        SELECT m.id, m.organization_id, m.code, m.title, m.name
        FROM menus m
        WHERE m.organization_id = user_org_id 
        AND m.is_active = TRUE
        AND m.is_visible = TRUE
    LOOP
        -- Compute permissions for this specific menu by checking user roles and permissions
        SELECT 
            jsonb_build_object(
                'can_view', COALESCE(bool_or(p.action_type = 'read'), false),
                'can_create', COALESCE(bool_or(p.action_type = 'create'), false),
                'can_update', COALESCE(bool_or(p.action_type = 'update'), false),
                'can_delete', COALESCE(bool_or(p.action_type = 'delete'), false),
                'can_execute', COALESCE(bool_or(p.action_type = 'execute'), false),
                'can_approve', COALESCE(bool_or(p.action_type = 'approve'), false),
                'can_export', COALESCE(bool_or(p.action_type = 'export'), false)
            ),
            jsonb_build_object(
                'role_permissions', jsonb_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL),
                'user_overrides', jsonb_agg(DISTINCT upo.override_type) FILTER (WHERE upo.override_type IS NOT NULL),
                'computed_at', CURRENT_TIMESTAMP
            )
        INTO computed_permissions, access_sources
        FROM user_roles ur
        LEFT JOIN roles r ON ur.role_id = r.id AND r.is_active = TRUE
        LEFT JOIN role_permissions rp ON r.id = rp.role_id 
            AND (rp.valid_until IS NULL OR rp.valid_until > CURRENT_TIMESTAMP)
        LEFT JOIN permissions p ON rp.permission_id = p.id
        LEFT JOIN menu_permissions mp ON p.id = mp.permission_id AND mp.menu_id = menu_record.id
        LEFT JOIN user_permission_overrides upo ON upo.user_id = ur.user_id 
            AND upo.permission_id = p.id 
            AND upo.is_active = TRUE
            AND (upo.valid_until IS NULL OR upo.valid_until > CURRENT_TIMESTAMP)
        WHERE ur.user_id = target_user_id
        AND ur.is_active = TRUE
        AND (ur.valid_until IS NULL OR ur.valid_until > CURRENT_TIMESTAMP);
        
        -- Insert computed access permissions for this menu
        INSERT INTO user_menu_access (
            user_id, menu_id,
            can_view, can_create, can_read, can_update, can_delete, 
            can_execute, can_approve, can_export,
            access_source, computed_at, expires_at
        ) VALUES (
            target_user_id, 
            menu_record.id,
            COALESCE((computed_permissions->>'can_view')::boolean, false),
            COALESCE((computed_permissions->>'can_create')::boolean, false),
            COALESCE((computed_permissions->>'can_view')::boolean, false), -- read = view untuk simplicity
            COALESCE((computed_permissions->>'can_update')::boolean, false),
            COALESCE((computed_permissions->>'can_delete')::boolean, false),
            COALESCE((computed_permissions->>'can_execute')::boolean, false),
            COALESCE((computed_permissions->>'can_approve')::boolean, false),
            COALESCE((computed_permissions->>'can_export')::boolean, false),
            access_sources,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP + INTERVAL '1 hour' -- Cache expires in 1 hour
        );
    END LOOP;
    
    -- Log the cache refresh operation for audit purposes
    INSERT INTO audit_logs (
        user_id, action, table_name, record_id, 
        new_values, description
    ) VALUES (
        target_user_id, 'UPDATE', 'user_menu_access', target_user_id::text,
        jsonb_build_object('cache_refreshed', true, 'timestamp', CURRENT_TIMESTAMP, 'organization_id', user_org_id),
        'User menu access cache refreshed for organization ' || user_org_id
    );
    
EXCEPTION WHEN OTHERS THEN
    -- If cache refresh fails, log the error but don't fail the operation
    RAISE WARNING 'Failed to refresh menu access cache for user %: %', target_user_id, SQLERRM;
END;
$refresh_access$ LANGUAGE plpgsql;

-- Function untuk check user permission dengan comprehensive logic
CREATE OR REPLACE FUNCTION check_user_permission(
    user_id UUID,
    permission_code VARCHAR,
    organization_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $check_permission$
DECLARE
    has_permission BOOLEAN := FALSE;
    user_org_id UUID;
BEGIN
    -- If no organization specified, get user's default organization
    IF organization_id IS NULL THEN
        SELECT e.organization_id INTO user_org_id
        FROM employees e 
        WHERE e.user_id = check_user_permission.user_id
        LIMIT 1;
    ELSE
        user_org_id := organization_id;
    END IF;
    
    -- First check: Look for permission through user roles
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = check_user_permission.user_id
        AND p.code = permission_code
        AND ur.is_active = TRUE
        AND (user_org_id IS NULL OR ur.organization_id = user_org_id)
        AND (ur.valid_until IS NULL OR ur.valid_until > CURRENT_TIMESTAMP)
        AND (rp.valid_until IS NULL OR rp.valid_until > CURRENT_TIMESTAMP)
        AND p.organization_id = COALESCE(user_org_id, p.organization_id)
    ) INTO has_permission;
    
    -- Second check: Look for direct user permission grants if not found through roles
    IF NOT has_permission THEN
        SELECT EXISTS (
            SELECT 1
            FROM user_permission_overrides upo
            JOIN permissions p ON upo.permission_id = p.id
            WHERE upo.user_id = check_user_permission.user_id
            AND p.code = permission_code
            AND upo.override_type = 'grant'
            AND upo.is_active = TRUE
            AND (upo.valid_until IS NULL OR upo.valid_until > CURRENT_TIMESTAMP)
            AND p.organization_id = COALESCE(user_org_id, p.organization_id)
        ) INTO has_permission;
    END IF;
    
    -- Third check: Look for explicit permission revokes that override grants
    IF has_permission THEN
        SELECT NOT EXISTS (
            SELECT 1
            FROM user_permission_overrides upo
            JOIN permissions p ON upo.permission_id = p.id
            WHERE upo.user_id = check_user_permission.user_id
            AND p.code = permission_code
            AND upo.override_type = 'revoke'
            AND upo.is_active = TRUE
            AND (upo.valid_until IS NULL OR upo.valid_until > CURRENT_TIMESTAMP)
            AND p.organization_id = COALESCE(user_org_id, p.organization_id)
        ) INTO has_permission;
    END IF;
    
    RETURN has_permission;
    
EXCEPTION WHEN OTHERS THEN
    -- If permission check fails, default to no permission for security
    RAISE WARNING 'Permission check failed for user % and permission %: %', user_id, permission_code, SQLERRM;
    RETURN FALSE;
END;
$check_permission$ LANGUAGE plpgsql;

-- ============================================================================
-- APPLY TRIGGERS - Order is important here
-- ============================================================================

-- Apply checksum trigger first
CREATE TRIGGER audit_logs_checksum_trigger
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION generate_audit_checksum();

-- Apply partition trigger 
CREATE TRIGGER audit_logs_partition_trigger
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION create_monthly_audit_partition();

-- Apply audit triggers to important tables
CREATE TRIGGER users_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER employees_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER user_roles_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER user_permission_overrides_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_permission_overrides
    FOR EACH ROW
    EXECUTE FUNCTION audit_table_changes();

-- ============================================================================
-- INITIAL SYSTEM DATA - Added in correct dependency order
-- ============================================================================

-- Step 1: Insert default organization (foundation data)
INSERT INTO organizations (id, name, slug, settings) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'TechCorp Indonesia', 'techcorp', '{"demo": true}');

-- Step 2: Insert system permissions (depends on organization)
INSERT INTO permissions (organization_id, code, name, category, action_type, is_system_permission) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'system.admin', 'System Administration', 'system', 'execute', true),
('550e8400-e29b-41d4-a716-446655440000', 'user.create', 'Create Users', 'user_management', 'create', true),
('550e8400-e29b-41d4-a716-446655440000', 'user.read', 'View Users', 'user_management', 'read', true),
('550e8400-e29b-41d4-a716-446655440000', 'user.update', 'Update Users', 'user_management', 'update', true),
('550e8400-e29b-41d4-a716-446655440000', 'user.delete', 'Delete Users', 'user_management', 'delete', true),
('550e8400-e29b-41d4-a716-446655440000', 'employee.create', 'Create Employees', 'employee', 'create', true),
('550e8400-e29b-41d4-a716-446655440000', 'employee.read', 'View Employees', 'employee', 'read', true),
('550e8400-e29b-41d4-a716-446655440000', 'employee.update', 'Update Employees', 'employee', 'update', true),
('550e8400-e29b-41d4-a716-446655440000', 'employee.delete', 'Delete Employees', 'employee', 'delete', true),
('550e8400-e29b-41d4-a716-446655440000', 'payroll.read', 'View Payroll', 'payroll', 'read', true);

-- Step 3: Insert system roles (depends on organization)
INSERT INTO roles (id, organization_id, name, slug, description, level, role_type, is_system_role) VALUES
('550e8400-e29b-41d4-a716-446655441001', '550e8400-e29b-41d4-a716-446655440000', 'System Administrator', 'system_admin', 'Full system access', 1, 'system', true),
('550e8400-e29b-41d4-a716-446655441002', '550e8400-e29b-41d4-a716-446655440000', 'HR Manager', 'hr_manager', 'Human resources management', 5, 'functional', true),
('550e8400-e29b-41d4-a716-446655441003', '550e8400-e29b-41d4-a716-446655440000', 'Employee', 'employee', 'Basic employee access', 10, 'functional', true);

-- Step 4: Insert system menus (depends on organization, includes required slug field)
INSERT INTO menus (id, organization_id, code, name, slug, title, route_path, sort_order, is_system_menu) VALUES
('550e8400-e29b-41d4-a716-446655442001', '550e8400-e29b-41d4-a716-446655440000', 'dashboard', 'Dashboard', 'dashboard', 'Dashboard', '/dashboard', 1, true),
('550e8400-e29b-41d4-a716-446655442002', '550e8400-e29b-41d4-a716-446655440000', 'employee_management', 'Employee Management', 'employee-management', 'Manajemen Karyawan', '/employees', 2, true),
('550e8400-e29b-41d4-a716-446655442003', '550e8400-e29b-41d4-a716-446655440000', 'user_management', 'User Management', 'user-management', 'Manajemen User', '/users', 3, true),
('550e8400-e29b-41d4-a716-446655442004', '550e8400-e29b-41d4-a716-446655440000', 'payroll_admin', 'Payroll Administration', 'payroll-admin', 'Administrasi Payroll', '/payroll', 4, true);

-- Step 5: Link permissions to menus (depends on menus and permissions)
INSERT INTO menu_permissions (menu_id, permission_id) VALUES
('550e8400-e29b-41d4-a716-446655442002', (SELECT id FROM permissions WHERE code = 'employee.read' LIMIT 1)),
('550e8400-e29b-41d4-a716-446655442003', (SELECT id FROM permissions WHERE code = 'user.read' LIMIT 1)),
('550e8400-e29b-41d4-a716-446655442004', (SELECT id FROM permissions WHERE code = 'payroll.read' LIMIT 1));

-- Step 6: Assign permissions to HR Manager role (depends on roles and permissions)
INSERT INTO role_permissions (role_id, permission_id, granted_by) 
SELECT 
    '550e8400-e29b-41d4-a716-446655441002',
    p.id,
    NULL
FROM permissions p 
WHERE p.code IN ('employee.create', 'employee.read', 'employee.update', 'user.read');

-- Step 7: Insert sample departments (depends on organization)
INSERT INTO departments (id, organization_id, name, code, description, is_active) VALUES
('550e8400-e29b-41d4-a716-446655443001', '550e8400-e29b-41d4-a716-446655440000', 'Information Technology', 'IT', 'Technology department', true),
('550e8400-e29b-41d4-a716-446655443002', '550e8400-e29b-41d4-a716-446655440000', 'Human Resources', 'HR', 'Human resources department', true);

-- Step 8: Insert sample job positions (depends on organization and departments)
INSERT INTO job_positions (id, organization_id, department_id, title, code, description, grade_level, is_active) VALUES
('550e8400-e29b-41d4-a716-446655444001', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655443001', 'System Administrator', 'SYS_ADMIN', 'System administration role', 5, true),
('550e8400-e29b-41d4-a716-446655444002', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655443002', 'HR Manager', 'HR_MGR', 'Human resources manager', 7, true);

-- Step 9: Insert sample system admin user
INSERT INTO users (id, email, first_name, last_name, status, created_at) VALUES
('550e8400-e29b-41d4-a716-446655445001', 'admin@techcorp.com', 'System', 'Administrator', 'active', CURRENT_TIMESTAMP);

-- Step 10: Insert sample employee for the admin user (depends on users, organization, departments, job_positions)
INSERT INTO employees (id, user_id, organization_id, employee_number, first_name, last_name, department_id, job_position_id, employment_type, hire_date) VALUES
('550e8400-e29b-41d4-a716-446655446001', '550e8400-e29b-41d4-a716-446655445001', '550e8400-e29b-41d4-a716-446655440000', 'EMP001', 'System', 'Administrator', '550e8400-e29b-41d4-a716-446655443001', '550e8400-e29b-41d4-a716-446655444001', 'permanent', CURRENT_DATE);

-- Step 11: Now we can safely add the foreign key constraint for department head
ALTER TABLE departments ADD CONSTRAINT fk_departments_head 
FOREIGN KEY (head_id) REFERENCES employees(id);

-- ============================================================================
-- USEFUL VIEWS for monitoring and reporting
-- ============================================================================

-- View untuk melihat user permissions dengan source information
CREATE OR REPLACE VIEW v_user_permissions AS
SELECT 
    u.email,
    u.first_name || ' ' || COALESCE(u.last_name, '') as full_name,
    e.employee_number,
    o.name as organization_name,
    r.name as role_name,
    p.code as permission_code,
    p.name as permission_name,
    p.category as permission_category,
    CASE 
        WHEN upo.override_type = 'grant' THEN 'Granted via Override'
        WHEN upo.override_type = 'revoke' THEN 'Revoked via Override'
        WHEN rp.id IS NOT NULL THEN 'Granted via Role: ' || r.name
        ELSE 'No Access'
    END as access_source,
    ur.valid_from as role_valid_from,
    ur.valid_until as role_valid_until
FROM users u
LEFT JOIN employees e ON u.id = e.user_id
LEFT JOIN organizations o ON e.organization_id = o.id
LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
LEFT JOIN user_permission_overrides upo ON u.id = upo.user_id AND p.id = upo.permission_id AND upo.is_active = true
WHERE u.status = 'active' AND u.deleted_at IS NULL;

-- View untuk audit activity summary dengan better performance
CREATE OR REPLACE VIEW v_audit_summary AS
SELECT 
    DATE_TRUNC('day', created_at) as audit_date,
    action,
    table_name,
    COUNT(*) as activity_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT organization_id) as affected_organizations
FROM audit_logs 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), action, table_name
ORDER BY audit_date DESC, activity_count DESC;

-- View untuk user menu access yang mudah dipahami
CREATE OR REPLACE VIEW v_user_menu_access AS
SELECT 
    u.email,
    u.first_name || ' ' || COALESCE(u.last_name, '') as full_name,
    e.employee_number,
    m.title as menu_title,
    m.route_path,
    uma.can_view,
    uma.can_create,
    uma.can_update,
    uma.can_delete,
    uma.can_execute,
    uma.can_approve,
    uma.can_export,
    uma.computed_at,
    uma.expires_at
FROM users u
JOIN employees e ON u.id = e.user_id
JOIN user_menu_access uma ON u.id = uma.user_id
JOIN menus m ON uma.menu_id = m.id
WHERE u.status = 'active' AND u.deleted_at IS NULL
ORDER BY u.email, m.sort_order;

-- ============================================================================
-- PARTITION MAINTENANCE PROCEDURES - Enhanced
-- ============================================================================

-- Function untuk cleanup old partitions dengan safety checks
CREATE OR REPLACE FUNCTION cleanup_old_audit_partitions(months_to_keep INTEGER DEFAULT 12)
RETURNS VOID AS $cleanup_partitions$
DECLARE
    partition_record RECORD;
    cutoff_date DATE;
    records_count INTEGER;
BEGIN
    -- Calculate cutoff date based on retention policy
    cutoff_date := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * months_to_keep);
    
    -- Find old partitions to clean up
    FOR partition_record IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE tablename LIKE 'audit_logs_y%'
        AND tablename < 'audit_logs_y' || TO_CHAR(cutoff_date, 'YYYY') || 'm' || TO_CHAR(cutoff_date, 'MM')
        ORDER BY tablename
    LOOP
        -- Check how many records will be affected
        EXECUTE 'SELECT COUNT(*) FROM ' || quote_ident(partition_record.tablename) INTO records_count;
        
        -- Drop the old partition
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(partition_record.tablename);
        
        RAISE NOTICE 'Dropped old partition: % (contained % records)', partition_record.tablename, records_count;
    END LOOP;
END;
$cleanup_partitions$ LANGUAGE plpgsql;

-- Function untuk create future partitions dengan error handling
CREATE OR REPLACE FUNCTION create_future_audit_partitions(months_ahead INTEGER DEFAULT 3)
RETURNS VOID AS $create_partitions$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    i INTEGER;
BEGIN
    FOR i IN 1..months_ahead LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month' * i);
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'audit_logs_y' || TO_CHAR(start_date, 'YYYY') || 'm' || TO_CHAR(start_date, 'MM');
        
        -- Check if partition already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_class WHERE relname = partition_name
        ) THEN
            -- Create the partition
            EXECUTE FORMAT(
                'CREATE TABLE %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',
                partition_name, start_date, end_date
            );
            
            -- Create indexes on new partition for better performance
            EXECUTE FORMAT('CREATE INDEX %I ON %I(user_id, created_at)', 
                          'idx_' || partition_name || '_user_time', partition_name);
            EXECUTE FORMAT('CREATE INDEX %I ON %I(action, created_at)', 
                          'idx_' || partition_name || '_action_time', partition_name);
            EXECUTE FORMAT('CREATE INDEX %I ON %I(table_name, record_id)', 
                          'idx_' || partition_name || '_table_record', partition_name);
                          
            RAISE NOTICE 'Created future partition: %', partition_name;
        ELSE
            RAISE NOTICE 'Partition % already exists, skipping', partition_name;
        END IF;
    END LOOP;
END;
$create_partitions$ LANGUAGE plpgsql;

-- Create future partitions immediately for better performance
SELECT create_future_audit_partitions(6);

INSERT INTO audit_logs (action, table_name, record_id, new_values, description) VALUES
('CREATE', 'database_schema', 'initial_setup', 
 jsonb_build_object(
   'version', '1.0',
   'created_at', CURRENT_TIMESTAMP,
   'database_initialized', true,
   'components', jsonb_build_array('tables', 'functions', 'triggers', 'views', 'sample_data')
 ), 
 'Database schema initialized successfully');

-- ============================================================================
-- VERIFICATION QUERIES (run these to verify the setup)
-- ============================================================================

-- Verify tables were created successfully
SELECT 
    'Tables Created' as verification_type,
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Verify sample data was inserted correctly
SELECT 'Data Verification' as verification_type, 
       'Organizations' as table_name, COUNT(*) as record_count FROM organizations
UNION ALL
SELECT 'Data Verification', 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'Data Verification', 'Permissions', COUNT(*) FROM permissions
UNION ALL
SELECT 'Data Verification', 'Roles', COUNT(*) FROM roles
UNION ALL
SELECT 'Data Verification', 'Menus', COUNT(*) FROM menus
UNION ALL
SELECT 'Data Verification', 'Departments', COUNT(*) FROM departments
UNION ALL
SELECT 'Data Verification', 'Job Positions', COUNT(*) FROM job_positions
UNION ALL
SELECT 'Data Verification', 'Employees', COUNT(*) FROM employees
UNION ALL
SELECT 'Data Verification', 'Audit Logs', COUNT(*) FROM audit_logs
ORDER BY table_name;

-- Verify audit partitions were created
SELECT 
    'Partition Verification' as verification_type,
    schemaname,
    tablename as partition_name
FROM pg_tables 
WHERE tablename LIKE 'audit_logs_y%'
ORDER BY tablename;

-- Test the permission checking function
SELECT 
    'Permission Test' as verification_type,
    'admin@techcorp.com' as user_email,
    'employee.read' as permission_code,
    check_user_permission(
        (SELECT id FROM users WHERE email = 'admin@techcorp.com'), 
        'employee.read'
    ) as has_permission;

-- Verify functions were created successfully
SELECT 
    'Function Verification' as verification_type,
    routine_name as function_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('audit_table_changes', 'check_user_permission', 'refresh_user_menu_access')
ORDER BY routine_name;
