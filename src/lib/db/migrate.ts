import fs from 'fs';
import path from 'path';
import { getDb } from './client';

export async function runMigrations() {
  console.log('🔄 Running CineBook database migrations...');
  const schemaPath = path.resolve(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const db = await getDb();

  // Execute migration schema
  if (db.exec) {
    await db.exec(sql);
  } else {
    await db.query(sql);
  }

  // Ensure migration tracking table exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(64) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    INSERT INTO schema_migrations (version)
    VALUES ('001_initial_schema')
    ON CONFLICT (version) DO NOTHING;
  `);

  console.log('✅ CineBook database migrations completed successfully.');
}

if (process.argv[1] && process.argv[1].includes('migrate')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}
