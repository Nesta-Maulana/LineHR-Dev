import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { EnvUtil } from './src/shared/utils/env.util';

config();

export default new DataSource({
  type: 'postgres',
  host: EnvUtil.getString('DB_HOST', 'localhost'),
  port: EnvUtil.getInt('DB_PORT', 5432),
  username: EnvUtil.getString('DB_USERNAME', 'hr_user'),
  password: EnvUtil.getString('DB_PASSWORD', 'hr_password'),
  database: EnvUtil.getString('DB_DATABASE', 'hr_management'),
  synchronize: false,
  logging: EnvUtil.getBoolean('DB_LOGGING', false),
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/**/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
});