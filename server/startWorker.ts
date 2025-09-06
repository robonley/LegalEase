import { createIngestionWorker } from './queueService';
import { IngestionWorker } from './ingestionWorker';

// Create and start the ingestion worker
const worker = new IngestionWorker();

// For development without Redis, we'll process jobs immediately
// In production with Redis, this will be a proper background worker
const ingestionWorker = createIngestionWorker(async (job) => {
  console.log(`Processing job ${job.id} for user ${job.data.userId}`);
  return await worker.processJob(job);
});

// Start the worker
if (typeof ingestionWorker.start === 'function') {
  ingestionWorker.start();
  console.log('Ingestion worker started');
} else {
  console.log('In-memory job processing enabled');
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  if (typeof ingestionWorker.close === 'function') {
    await ingestionWorker.close();
  }
  process.exit(0);
});

export { ingestionWorker };