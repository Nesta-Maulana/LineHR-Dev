#!/usr/bin/env node
import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import dataSource from '../../ormconfig';

async function seedAdmin() {
  try {
    console.log('🌱 Creating admin user...');
    
    // Initialize the data source
    await dataSource.initialize();
    
    // Generate password hash for 'Admin@123'
    const password = 'Admin@123';
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Check if admin user already exists
    const existingUser = await dataSource.query(
      `SELECT id FROM users WHERE email = $1`,
      ['admin@hrmanagement.com']
    );
    
    if (existingUser.length > 0) {
      console.log('✅ Admin user already exists');
      await dataSource.destroy();
      process.exit(0);
    }
    
    // Get the Super Admin role
    const role = await dataSource.query(
      `SELECT id FROM roles WHERE code = $1`,
      ['SUPER_ADMIN']
    );
    
    if (role.length === 0) {
      console.error('❌ Super Admin role not found. Run migrations first.');
      await dataSource.destroy();
      process.exit(1);
    }
    
    // Create admin user
    const result = await dataSource.query(
      `INSERT INTO users (
        email,
        username,
        password_hash,
        first_name,
        last_name,
        status,
        email_verified,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        'admin@hrmanagement.com',
        'admin',
        passwordHash,
        'System',
        'Administrator',
        'active',
        true,
        new Date(),
        new Date()
      ]
    );
    
    const userId = result[0].id;
    
    // Create employee record
    await dataSource.query(
      `INSERT INTO employees (
        user_id,
        employee_code,
        role_id,
        job_title,
        employment_status,
        hire_date,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        'EMP001',
        role[0].id,
        'System Administrator',
        'active',
        new Date(),
        new Date(),
        new Date()
      ]
    );
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@hrmanagement.com');
    console.log('🔑 Password: Admin@123');
    console.log('\n⚠️  Please change the password after first login!');
    
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seed
seedAdmin();