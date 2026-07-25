import { DataSource } from 'typeorm';

async function run() {
  const AppDataSource = new DataSource({
    type: 'postgres',
    host: '127.0.0.1',
    port: 5432,
    username: 'postgres',
    password: 'Tanawal@09',
    database: 'clinic_db',
    entities: [],
    synchronize: false
  });
  
  await AppDataSource.initialize();
  console.log('DataSource initialized.');

  const queryRunner = AppDataSource.createQueryRunner();
  
  console.log('Adding columns to actions table...');
  await queryRunner.query(`
    ALTER TABLE actions 
    ADD COLUMN IF NOT EXISTS comments text,
    ADD COLUMN IF NOT EXISTS comments_updated_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS resolution_notes text;
  `);
  console.log('Columns added successfully!');
  
  await AppDataSource.destroy();
}

run().catch(err => {
  console.error('Error running script:', err);
});
