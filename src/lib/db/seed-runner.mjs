import { runSeed } from './seed.ts';

runSeed()
  .then(() => {
    console.log('Seed execution finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
