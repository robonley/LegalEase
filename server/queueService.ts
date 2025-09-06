import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection - use environment variable or in-memory fallback for development
let redis: IORedis | undefined;

try {
  if (process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL) {
    redis = new IORedis(process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL!);
  } else {
    // For development without Redis, we'll use a simple in-memory queue
    console.warn('No Redis URL found. Using in-memory job processing for development.');
  }
} catch (error) {
  console.warn('Failed to connect to Redis. Using in-memory job processing:', error);
}

// Queue configuration
const queueConfig = redis ? { connection: redis } : {};

// Job queue for PDF ingestion
export const ingestionQueue = new Queue('ingestion', queueConfig);

export interface IngestionJobData {
  jobId: string;
  userId: string;
  filename: string;
  fileKey: string;
}

export interface IngestionJobResult {
  success: boolean;
  extractionResult?: any;
  error?: string;
  tokensUsed?: number;
  processingTimeMs?: number;
}

// Add a job to the ingestion queue
export async function addIngestionJob(data: IngestionJobData): Promise<Job<IngestionJobData>> {
  return await ingestionQueue.add('extract', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 50, // Keep last 50 completed jobs
    removeOnFail: 20, // Keep last 20 failed jobs
  });
}

// Get job status
export async function getJobStatus(jobId: string): Promise<Job | null> {
  return await ingestionQueue.getJob(jobId);
}

// Create worker (will be started separately)
export function createIngestionWorker(processor: (job: Job<IngestionJobData>) => Promise<IngestionJobResult>) {
  if (!redis) {
    // For development without Redis, process jobs immediately
    return {
      process: processor,
      start: () => console.log('In-memory worker started'),
      close: () => Promise.resolve(),
    };
  }

  return new Worker<IngestionJobData, IngestionJobResult>('ingestion', processor, {
    connection: redis,
    concurrency: 2, // Process up to 2 jobs concurrently
  });
}

// Clean up old jobs periodically
export async function cleanOldJobs() {
  await ingestionQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'); // Remove completed jobs older than 24h
  await ingestionQueue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed'); // Remove failed jobs older than 7 days
}