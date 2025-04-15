import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import subtitleService from './subtitleService';
import redisService from './redisService';
import redisMonitoringService from './redisMonitoringService';
import { AppError } from '../middleware/errorHandler';
import { SubtitleGenerationStatus } from '../types';
import { databases, DATABASE_ID, SUBTITLES_COLLECTION_ID } from '../config/appwrite';
import { redisClient } from '../config/redis';

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

// Use the existing Redis client for BullMQ
const getRedisConnection = () => {
  // Check if the main Redis client is ready
  if (redisClient.status === 'ready') {
    console.log('[BackgroundJobService] Using existing Redis client');
    return redisClient;
  }

  // If the main client isn't ready, create a new connection as fallback
  console.warn('[BackgroundJobService] Main Redis client not ready, creating new connection');
  return new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  });
};

// Create queues
const subtitleGenerationQueue = new Queue(QUEUE_NAMES.SUBTITLE_GENERATION, {
  connection: getRedisConnection(),
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
  connection: getRedisConnection(),
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

        // Try to update the file hash record with the subtitle ID
        try {
          // Update job progress
          await job.updateProgress({ stage: 'updating_cache', progress: 95, message: 'Updating file hash cache' });

          // Instead of downloading the entire file again, use a simpler approach
          // Just try to find the hash directly from Redis service

          try {
            // Get all file hashes that point to this video ID
            let cursor = '0';
            let fileHash = null;

            if (redisClient.status !== 'ready') {
              console.warn('[BackgroundJobService] Redis not ready, skipping file hash update');
              return;
            }

            do {
              const reply = await redisClient.scan(cursor, 'MATCH', 'file:hash:*', 'COUNT', '100');
              cursor = reply[0];
              const keys = reply[1];

              // Check each key to find one that points to our video ID
              for (const key of keys) {
                const value = await redisClient.get(key);
                if (value) {
                  try {
                    const data = JSON.parse(value);
                    if (data.videoId === videoId) {
                      // Extract the hash from the key (remove the 'file:hash:' prefix)
                      fileHash = key.substring(10);
                      break;
                    }
                  } catch (e) {
                    console.warn(`[BackgroundJobService] Error parsing JSON for key ${key}:`, e);
                  }
                }
              }

              // If we found a hash, break out of the loop
              if (fileHash) {
                break;
              }
            } while (cursor !== '0');

            if (!fileHash) {
              console.warn(`[BackgroundJobService] Could not find file hash for video ID ${videoId}, skipping update`);
              return;
            }

            // Update the hash record with the subtitle ID
            await redisService.updateFileHashWithSubtitle(fileHash, subtitle.id);
            console.log(`[BackgroundJobService] Updated file hash ${fileHash} with subtitle ID ${subtitle.id}`);
          } catch (error) {
            console.warn(`[BackgroundJobService] Error finding or updating file hash: ${error}`);
            // Don't throw here, just log the warning
          }

          // The hash record is already updated in the try block above
        } catch (error) {
          // Log but don't fail if updating the hash record fails
          console.warn(`[BackgroundJobService] Failed to update file hash record with subtitle ID: ${error}`);
        }

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
    connection: getRedisConnection(),
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
  // Cleanup job interval (default: 24 hours)
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the service
   */
  constructor() {
    this.scheduleCleanupJob();
  }
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

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('[BackgroundJobService] Cleanup interval cleared');
    }

    await subtitleGenerationWorker.close();
    await subtitleGenerationQueue.close();
    console.log('[BackgroundJobService] Shutdown complete');
  }

  /**
   * Schedule a periodic job to clean up expired file hashes
   */
  private scheduleCleanupJob(): void {
    // Run cleanup job every 24 hours
    const cleanupIntervalMs = 24 * 60 * 60 * 1000; // 24 hours

    // Run an initial cleanup after 5 minutes
    setTimeout(async () => {
      await this.runCleanupJob();
    }, 5 * 60 * 1000);

    // Schedule regular cleanup
    this.cleanupInterval = setInterval(async () => {
      await this.runCleanupJob();
    }, cleanupIntervalMs);

    console.log(`[BackgroundJobService] Scheduled file hash cleanup job to run every ${cleanupIntervalMs / (60 * 60 * 1000)} hours`);
  }

  /**
   * Run the cleanup job to remove expired file hashes
   */
  private async runCleanupJob(): Promise<void> {
    try {
      console.log('[BackgroundJobService] Running file hash cleanup job...');

      // Get file hash statistics before cleanup
      const beforeStats = await redisMonitoringService.getFileHashStats();
      console.log('[BackgroundJobService] File hash statistics before cleanup:', beforeStats);

      // Clean up expired file hashes and stale references
      const removedCount = await redisMonitoringService.cleanupExpiredFileHashes(true); // Pass true to check Appwrite
      console.log(`[BackgroundJobService] Removed ${removedCount} expired or stale file hash${removedCount === 1 ? '' : 'es'}`);

      // Get file hash statistics after cleanup
      const afterStats = await redisMonitoringService.getFileHashStats();
      console.log('[BackgroundJobService] File hash statistics after cleanup:', afterStats);

      // Get memory info after cleanup
      const memoryInfo = await redisMonitoringService.getMemoryInfo();
      console.log('[BackgroundJobService] Redis memory usage after cleanup:', {
        usedMemory: memoryInfo?.usedMemoryHuman,
        memoryUsagePercentage: memoryInfo?.memoryUsagePercentage.toFixed(2) + '%'
      });
    } catch (error) {
      console.error('[BackgroundJobService] Error running file hash cleanup job:', error);
    }
  }
}

// Export a singleton instance
export default new BackgroundJobService();
