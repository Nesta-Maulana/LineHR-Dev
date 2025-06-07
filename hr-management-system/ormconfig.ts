import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'hr_user',
  password: process.env.DB_PASSWORD || 'hr_password',
  database: process.env.DB_DATABASE || 'hr_management',
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/**/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
});