-- Create initial admin user for the HR Management System
-- Default credentials: admin@hrmanagement.com / Admin@123

-- Password hash for 'Admin@123' (bcrypt with 10 rounds)
-- You should change this password after first login
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
    '$2b$10$YourHashHere', -- This needs to be generated
    'System',
    'Administrator',
    'active',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;