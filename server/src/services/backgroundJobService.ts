import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import subtitleService from './subtitleService';
import { AppError } from '../middleware/errorHandler';
import { SubtitleGenerationStatus } from '../types';
import { databases, DATABASE_ID, SUBTITLES_COLLECTION_ID } from '../config/appwrite';

// Queue names
export const QUEUE_NAMES = {
  SUBTITLE_GENERATION: 'subtitle-generation',
};

// Job types
export const JOB_TYPES = {
  GENERATE_SUBTITLES: 'generate-subtitles',
};

// Job data interfaces
export interface GenerateSubtitlesJobData {
  videoId: string;
  language: string;
  documentId?: string; // Optional document ID if already created
}

// Job result interfaces
export interface GenerateSubtitlesJobResult {
  subtitleId: string;
  fileId: string;
  status: SubtitleGenerationStatus;
}

// Progress data interface
export interface JobProgressData {
  stage: string;
  progress: number;
  message?: string;
}

// Connection options for BullMQ (used in comments for reference)
// const connectionOptions = {
//   connection: {
//     host: process.env.REDIS_HOST || '127.0.0.1',
//     port: parseInt(process.env.REDIS_PORT || '6379', 10),
//     password: process.env.REDIS_PASSWORD,
//   },
// };

// Create a new Redis connection for BullMQ if needed
const createRedisConnection = () => {
  return new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  });
};

// Create queues
const subtitleGenerationQueue = new Queue(QUEUE_NAMES.SUBTITLE_GENERATION, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5 seconds initial delay
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200, // Keep last 200 failed jobs
  },
});

// Create queue events for monitoring
const subtitleGenerationEvents = new QueueEvents(QUEUE_NAMES.SUBTITLE_GENERATION, {
  connection: createRedisConnection(),
});

// Set up event listeners
subtitleGenerationEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`[BackgroundJobService] Job ${jobId} completed with result:`, returnvalue);
});

subtitleGenerationEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[BackgroundJobService] Job ${jobId} failed with reason:`, failedReason);
});

subtitleGenerationEvents.on('progress', ({ jobId, data }) => {
  console.log(`[BackgroundJobService] Job ${jobId} reported progress:`, data);
});

// Create workers
const subtitleGenerationWorker = new Worker(
  QUEUE_NAMES.SUBTITLE_GENERATION,
  async (job: Job) => {
    console.log(`[BackgroundJobService] Processing job ${job.id} of type ${job.name}`);

    try {
      // Update job progress
      await job.updateProgress({ stage: 'initializing', progress: 0, message: 'Starting subtitle generation' });

      if (job.name === JOB_TYPES.GENERATE_SUBTITLES) {
        const { videoId, language, documentId } = job.data as GenerateSubtitlesJobData;

        // Create a document in Appwrite if not already created
        let subtitleDocumentId = documentId;
        if (!subtitleDocumentId) {
          // Create a placeholder document with PROCESSING status
          // This will be implemented in subtitleService
        }

        // Update job progress
        await job.updateProgress({ stage: 'processing', progress: 10, message: 'Processing video' });

        // Call the subtitle service to generate subtitles
        const subtitle = await subtitleService.generateSubtitlesForJob(videoId, language, job);

        // Return the result
        return {
          subtitleId: subtitle.id,
          fileId: subtitle.fileId,
          status: SubtitleGenerationStatus.COMPLETED,
        } as GenerateSubtitlesJobResult;
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    } catch (error: any) {
      console.error(`[BackgroundJobService] Job ${job.id} failed:`, error);

      // Update the subtitle document status to FAILED if it exists
      try {
        if (job.name === JOB_TYPES.GENERATE_SUBTITLES) {
          const { documentId } = job.data as GenerateSubtitlesJobData;
          if (documentId) {
            await databases.updateDocument(
              DATABASE_ID,
              SUBTITLES_COLLECTION_ID,
              documentId,
              {
                status: SubtitleGenerationStatus.FAILED,
                processingMetadata: JSON.stringify({
                  error: error.message || 'Unknown error',
                  failedAt: new Date().toISOString()
                })
              }
            );
          }
        }
      } catch (updateError: any) {
        console.error(`[BackgroundJobService] Failed to update document status:`, updateError);
      }

      // Re-throw the error to mark the job as failed
      throw error;
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: 2, // Process 2 jobs at a time
    lockDuration: 30000, // 30 seconds lock
    lockRenewTime: 15000, // 15 seconds lock renew
  }
);

// Handle worker events
subtitleGenerationWorker.on('completed', (job: Job) => {
  console.log(`[BackgroundJobService] Worker completed job ${job.id}`);
});

subtitleGenerationWorker.on('failed', (job: Job | undefined, error: Error) => {
  console.error(`[BackgroundJobService] Worker failed job ${job?.id || 'unknown'}:`, error);
});

subtitleGenerationWorker.on('error', (error: Error) => {
  console.error(`[BackgroundJobService] Worker error:`, error);
});

/**
 * Service for managing background jobs
 */
export class BackgroundJobService {
  /**
   * Add a subtitle generation job to the queue
   * @param videoId Video ID
   * @param language Language code
   * @param documentId Optional document ID if already created
   * @returns Job ID
   */
  async addSubtitleGenerationJob(
    videoId: string,
    language: string = 'en',
    documentId?: string
  ): Promise<string> {
    try {
      const job = await subtitleGenerationQueue.add(
        JOB_TYPES.GENERATE_SUBTITLES,
        {
          videoId,
          language,
          documentId,
        } as GenerateSubtitlesJobData,
        {
          priority: 1, // High priority
          jobId: `subtitle-${videoId}-${language}-${Date.now()}`,
        }
      );

      console.log(`[BackgroundJobService] Added subtitle generation job ${job.id} for video ${videoId}`);
      return job.id as string;
    } catch (error: any) {
      console.error(`[BackgroundJobService] Failed to add subtitle generation job:`, error);
      throw new AppError(`Failed to queue subtitle generation job: ${error.message}`, 500);
    }
  }

  /**
   * Get job status and progress
   * @param jobId Job ID
   * @returns Job status and progress
   */
  async getJobStatus(jobId: string): Promise<{
    id: string;
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
    progress: JobProgressData | null;
    result: any | null;
    error: string | null;
  }> {
    try {
      const job = await subtitleGenerationQueue.getJob(jobId);

      if (!job) {
        throw new AppError(`Job ${jobId} not found`, 404);
      }

      const state = await job.getState();
      const progress = job.progress as JobProgressData || null;

      return {
        id: job.id as string,
        status: state,
        progress,
        result: job.returnvalue || null,
        error: job.failedReason || null,
      };
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get job status: ${error.message}`, 500);
    }
  }

  /**
   * Clean up completed and failed jobs
   * @param olderThan Jobs older than this many milliseconds will be removed
   * @returns Number of jobs removed
   */
  async cleanupJobs(olderThan: number = 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const timestamp = Date.now() - olderThan;
      const count = await subtitleGenerationQueue.clean(timestamp, 100, 'completed');
      const failedCount = await subtitleGenerationQueue.clean(timestamp, 100, 'failed');

      console.log(`[BackgroundJobService] Cleaned up ${count} completed and ${failedCount} failed jobs`);
      return Number(count) + Number(failedCount);
    } catch (error: any) {
      console.error(`[BackgroundJobService] Failed to clean up jobs:`, error);
      throw new AppError(`Failed to clean up jobs: ${error.message}`, 500);
    }
  }

  /**
   * Gracefully shut down the service
   */
  async shutdown(): Promise<void> {
    console.log('[BackgroundJobService] Shutting down...');
    await subtitleGenerationWorker.close();
    await subtitleGenerationQueue.close();
    console.log('[BackgroundJobService] Shutdown complete');
  }
}

// Export a singleton instance
export default new BackgroundJobService();
