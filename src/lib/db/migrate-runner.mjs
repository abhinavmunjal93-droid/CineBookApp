import { runMigrations } from './migrate.ts';

runMigrations()
  .then(() => {
    console.log('Migration execution finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration error:', err);
    process.exit(1);
  });
