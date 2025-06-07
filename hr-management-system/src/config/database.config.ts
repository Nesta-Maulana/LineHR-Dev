import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

const baseConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'hr_user',
  password: process.env.DB_PASSWORD || 'hr_password',
  database: process.env.DB_DATABASE || 'hr_management',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/**/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  migrationsRun: true,
  poolSize: parseInt(process.env.DB_POOL_SIZE, 10) || 10,
  extra: {
    max: parseInt(process.env.DB_POOL_SIZE, 10) || 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    statementTimeout: 30000,
  },
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

export default registerAs('database', (): TypeOrmModuleOptions => ({
  ...baseConfig,
  autoLoadEntities: true,
  retryAttempts: 3,
  retryDelay: 3000,
}));

// For TypeORM CLI
export const AppDataSource = new DataSource({
  ...baseConfig,
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/**/migrations/*{.ts,.js}'],
});