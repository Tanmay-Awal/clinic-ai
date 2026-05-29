import { DataSource } from 'typeorm';
import { join } from 'path';

const ext = __filename.endsWith('.ts') ? 'ts' : 'js';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'clinic_db',
  entities: [join(__dirname, `**/*.entity.${ext}`)],
  migrations: [join(__dirname, `migrations/*.${ext}`)],
  migrationsTableName: 'migrations',
});
