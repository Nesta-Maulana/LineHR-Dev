import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

config();

/**
 * Migration-specific data source configuration
 * This configuration is specifically for running migrations
 */
export const MigrationDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'hr_user',
  password: process.env.DB_PASSWORD || 'hr_password',
  database: process.env.DB_DATABASE || 'hr_management',
  synchronize: false,
  logging: true,
  entities: [
    path.join(__dirname, '../../entities/*.entity{.ts,.js}'),
    path.join(__dirname, '../../../*/persistence/entities/*.entity{.ts,.js}')
  ],
  migrations: [
    path.join(__dirname, '/*{.ts,.js}')
  ],
  migrationsTableName: 'migrations',
  migrationsRun: false,
});

export default MigrationDataSource;