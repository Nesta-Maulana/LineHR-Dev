-- Create initial admin user for the HR Management System
-- Default credentials: admin@hrmanagement.com / Admin@123

-- First, get the Super Admin role ID
DO $$
DECLARE
    role_id UUID;
    user_id UUID;
BEGIN
    -- Get Super Admin role
    SELECT id INTO role_id FROM roles WHERE code = 'SUPER_ADMIN';
    
    IF role_id IS NULL THEN
        RAISE EXCEPTION 'Super Admin role not found. Please run migrations first.';
    END IF;
    
    -- Check if admin user already exists
    SELECT id INTO user_id FROM users WHERE email = 'admin@hrmanagement.com';
    
    IF user_id IS NOT NULL THEN
        RAISE NOTICE 'Admin user already exists with ID: %', user_id;
        RETURN;
    END IF;
    
    -- Create admin user
    -- Password: Admin@123 (bcrypt hash)
    INSERT INTO users (
        email,
        username,
        password_hash,
        first_name,
        last_name,
        status,
        email_verified,
        created_at,
        updated_at
    ) VALUES (
        'admin@hrmanagement.com',
        'admin',
        '$2b$10$5sWKgZ2XQfKQa9Qoc9kJD.6q3Y0XBmsQD9fJ.QdJqDZh3S5Ivtg8a', -- Admin@123
        'System',
        'Administrator',
        'active',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING id INTO user_id;
    
    -- Create employee record
    INSERT INTO employees (
        user_id,
        employee_code,
        role_id,
        job_title,
        employment_status,
        hire_date,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        'EMP001',
        role_id,
        'System Administrator',
        'active',
        CURRENT_DATE,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );
    
    RAISE NOTICE 'Admin user created successfully!';
    RAISE NOTICE 'Email: admin@hrmanagement.com';
    RAISE NOTICE 'Password: Admin@123';
    RAISE NOTICE 'Please change the password after first login!';
END $$;