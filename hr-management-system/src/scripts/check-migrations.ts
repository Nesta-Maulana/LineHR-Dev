#!/usr/bin/env node
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import dataSource from '../../ormconfig';

dotenv.config();

/**
 * Script to check migration status
 * Usage: npx ts-node src/scripts/check-migrations.ts
 */
async function checkMigrations() {
  try {
    console.log('🔍 Checking migration status...');
    console.log(`📦 Database: ${process.env.DB_DATABASE || 'hr_management'}`);
    console.log(`🏠 Host: ${process.env.DB_HOST || 'localhost'}\n`);
    
    // Initialize the data source
    await dataSource.initialize();
    
    // Check if migrations table exists
    const tableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);
    
    if (!tableExists[0].exists) {
      console.log('⚠️  Migrations table does not exist. Run migrations to create it.');
      await dataSource.destroy();
      process.exit(0);
    }

    // Get executed migrations
    const executedMigrations = await dataSource.query(
      `SELECT * FROM migrations ORDER BY id DESC`
    );
    
    // Get pending migrations
    const pendingMigrations = await dataSource.showMigrations();
    
    console.log('📊 Migration Status:\n');
    console.log(`✅ Executed migrations: ${executedMigrations.length}`);
    console.log(`⏳ Pending migrations: ${pendingMigrations ? 'Yes' : 'No'}\n`);
    
    if (executedMigrations.length > 0) {
      console.log('📋 Executed migrations:');
      executedMigrations.forEach((migration: any, index: number) => {
        console.log(`   ${index + 1}. ${migration.name}`);
        console.log(`      Executed at: ${migration.timestamp}`);
      });
    }

    // Check database schema
    console.log('\n🏗️  Database Tables:');
    const tables = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    tables.forEach((table: any) => {
      console.log(`   - ${table.table_name}`);
    });

    await dataSource.destroy();
    console.log('\n✅ Migration check completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration check failed:', error);
    process.exit(1);
  }
}

// Check migrations
checkMigrations();