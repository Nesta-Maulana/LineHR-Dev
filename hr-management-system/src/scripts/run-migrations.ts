#!/usr/bin/env node
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import dataSource from '../../ormconfig';

dotenv.config();

/**
 * Script to run database migrations
 * Usage: npm run migration:run
 */
async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...');
    console.log(`📦 Database: ${process.env.DB_DATABASE || 'hr_management'}`);
    console.log(`🏠 Host: ${process.env.DB_HOST || 'localhost'}`);
    
    // Initialize the data source
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Run pending migrations
    const migrations = await dataSource.runMigrations();
    
    if (migrations.length === 0) {
      console.log('ℹ️  No pending migrations to run');
    } else {
      console.log(`✅ Successfully ran ${migrations.length} migration(s):`);
      migrations.forEach((migration) => {
        console.log(`   - ${migration.name}`);
      });
    }

    // Show current migration status
    const executedMigrations = await dataSource.query(
      `SELECT * FROM migrations ORDER BY id DESC`
    );
    
    console.log('\n📋 Current migration status:');
    console.log('Total executed migrations:', executedMigrations.length);
    
    if (executedMigrations.length > 0) {
      console.log('Latest migration:', executedMigrations[0].name);
    }

    await dataSource.destroy();
    console.log('\n✅ Migration process completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();