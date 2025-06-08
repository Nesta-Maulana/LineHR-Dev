-- Run this script as PostgreSQL superuser (postgres)
-- This creates the database user and database for the HR Management System

-- Create the database user
CREATE USER hr_user WITH PASSWORD 'hr_password';

-- Create the database
CREATE DATABASE hr_management OWNER hr_user;

-- Grant all privileges on the database to the user
GRANT ALL PRIVILEGES ON DATABASE hr_management TO hr_user;

-- Connect to the hr_management database to set up additional permissions
\c hr_management

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO hr_user;
GRANT CREATE ON SCHEMA public TO hr_user;

-- Make hr_user the owner of the public schema
ALTER SCHEMA public OWNER TO hr_user;