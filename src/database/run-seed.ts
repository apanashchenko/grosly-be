import * as fs from 'fs';
import * as path from 'path';
import dataSource from './datasource';

async function runSeed() {
  await dataSource.initialize();
  console.log('Database connected');

  const sql = fs.readFileSync(
    path.join(__dirname, '..', '..', 'src', 'database', 'seed.sql'),
    'utf-8',
  );

  await dataSource.query(sql);
  console.log('Seed completed successfully');

  await dataSource.destroy();
}

runSeed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
