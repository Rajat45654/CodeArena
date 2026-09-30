import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from local and root
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

console.log('[Worker] CodeArena Judge Worker initializing...');
console.log(`[Worker] Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`[Worker] Redis URL: ${process.env.REDIS_URL || 'redis://localhost:6380'}`);
console.log(`[Worker] Concurrency: ${process.env.JUDGE_CONCURRENCY || '2'}`);

async function main() {
  console.log('[Worker] Judge Worker online and awaiting jobs from BullMQ queue.');
}

main().catch((err) => {
  console.error('[Worker] Fatal error starting worker:', err);
  process.exit(1);
});
