import { ID } from 'node-appwrite';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import { Job } from 'bullmq';
import { validateSubtitleDocument } from '../utils/validationUtils';
import videoService from './videoService'; // Keep for video info if needed
import redisService, { CacheUnavailableError, CacheOperationError } from './redisService'; // Import redis service and errors
import { redisClient } from '../config/redis'; // Import redisClient for locking
import { AppwriteException } from 'node-appwrite'; // Import AppwriteException

// Import configurations
import {
  databases,
  storage,
  DATABASE_ID,
  SUBTITLES_COLLECTION_ID,
  SUBTITLES_BUCKET_ID,
} from '../config/appwrite';

// Import audio processing configuration
import AUDIO_PROCESSING from '../config/audioProcessing';

// Import utilities
import { extractAudio, cleanupTempFile as cleanupFfmpegTempFile } from '../utils/ffmpegUtils';
import { uploadAudioToGcs as uploadToGcsUtil, deleteFromGcs as deleteFromGcsUtil } from '../utils/gcsUtils';
import { VttFormatter } from '../utils/VttFormatter';
import { generateTranscriptionViaGemini } from '../utils/geminiUtils';
import { prepareVideoForProcessing } from '../utils/videoProcessingUtils'; // Import new util
import {
    uploadVttToAppwrite,
    createSubtitleDocumentInAppwrite,
    deleteSubtitleFileFromAppwrite,
    deleteSubtitleDocumentFromAppwrite
} from '../utils/appwriteUtils'; // Import new util

// Import types
import { Subtitle, SubtitleFormat, SubtitleGenerationStatus } from '../types';
import { AppError } from '../middleware/errorHandler';
import { createDocumentPermissions } from '../config/appwrite';

// Helper function for delays (copy from videoService)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Constants for locking (copy from videoService)
const LOCK_TIMEOUT_MS = 5000; // 5 seconds lock expiration
const LOCK_RETRY_DELAY_MS = 100; // Wait 100ms before retrying cache read
const MAX_LOCK_RETRIES = 5; // Max attempts to get data after waiting for lock
const SUBTITLE_LIST_CACHE_KEY_PREFIX = 'subtitle:list:'; // Prefix for list cache keys

/**
 * Service for orchestrating subtitle generation and managing subtitle metadata,
 * including caching with stampede protection.
 */
export class SubtitleService {

  // --- Private Lock Helper --- (Copy from videoService)
  private async acquireLock(key: string): Promise<boolean> {
    const lockKey = `${key}:lock`;
    try {
      const result = await redisClient.set(lockKey, 'locked', 'PX', LOCK_TIMEOUT_MS, 'NX');
      return result === 'OK';
    } catch (error) {
      console.error(`[SubtitleService] Error acquiring lock for key ${key}:`, error);
      return false;
    }
  }

  private async releaseLock(key: string): Promise<void> {
    const lockKey = `${key}:lock`;
    try {
      await redisClient.del(lockKey);
    } catch (error) {
      console.error(`[SubtitleService] Error releasing lock for key ${key}:`, error);
    }
  }
  // --- End Lock Helper ---

  /**
   * Orchestrates the generation of subtitles for a video.
   * This method is intended to be called directly from the controller for synchronous processing.
   * For background processing, use the backgroundJobService to queue a job instead.
   */
  async generateSubtitles(
    videoId: string,
    language: string = 'en'
  ): Promise<Subtitle> {
    console.log(`[SubtitleService] Orchestrating subtitle generation for video ${videoId}`);

    let audioTempFilePath: string | null = null;
    let gcsAudioPath: string | null = null;
    let vttTempFilePath: string | null = null;
    let uploadedVttFileId: string | null = null; // Track Appwrite file ID for cleanup on error

    try {
      // Step 1: Prepare video (validation, get stream) - Delegate
      const { video, videoStream } = await prepareVideoForProcessing(videoId);

      // Step 2: Extract audio - Delegate (assuming implementation in ffmpegUtils)
      console.log(`[SubtitleService] Requesting audio extraction...`);
      const { tempFilePath: audioPath, mimeType } = await extractAudio(videoStream, AUDIO_PROCESSING.FORMAT, {
          audioFrequency: AUDIO_PROCESSING.FREQUENCY,
          audioChannels: AUDIO_PROCESSING.CHANNELS,
          logLevel: AUDIO_PROCESSING.LOG_LEVEL
      });
      audioTempFilePath = audioPath;
      console.log(`[SubtitleService] Audio extracted to ${audioTempFilePath}`);

      // Step 3: Upload audio to GCS - Delegate (assuming implementation in gcsUtils)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const gcsFileName = `audio/${videoId}/${timestamp}.${AUDIO_PROCESSING.FORMAT}`;
      console.log(`[SubtitleService] Requesting audio upload to GCS as ${gcsFileName}...`);
      const gcsUri = await uploadToGcsUtil(audioTempFilePath, gcsFileName, {
          contentType: mimeType,
          metadata: { videoId: video.id, language, videoName: video.name, sourceType: 'gemini-transcription' }
      });
      gcsAudioPath = gcsFileName; // Store GCS path for cleanup
      console.log(`[SubtitleService] Audio uploaded to GCS: ${gcsUri}`);

      // Step 4: Generate transcription - Delegate
      const rawTranscription = await generateTranscriptionViaGemini(gcsUri, language, mimeType);

      // Step 5: Format transcription to VTT - Delegate
      const vttContent = VttFormatter.formatRawTranscriptionToVTT(rawTranscription);
      console.log(`[SubtitleService] VTT content generated (${Math.round(vttContent.length / 1024)}KB)`);

      // Step 6: Write VTT temp file and save to Appwrite - Delegate parts
      vttTempFilePath = path.join(path.dirname(audioTempFilePath), `subtitle_${videoId}_${timestamp}.vtt`);
      const result = await this.writeVttTempFileAndSaveToAppwrite(
          videoId,
          vttTempFilePath,
          vttContent,
          language,
          video.duration || 0
      );
      uploadedVttFileId = result.fileId; // Store for potential cleanup if subsequent steps fail (though none currently)

      console.log(`[SubtitleService] Subtitle generation completed successfully for video ${videoId}. Subtitle ID: ${result.id}`);
      return result;

    } catch (error: any) {
      console.error(`[SubtitleService] Orchestration failed: ${error.message}`, error.stack);

      // Attempt to clean up Appwrite file if it was uploaded before the error occurred
      if (uploadedVttFileId) {
          console.warn(`[SubtitleService] Attempting to clean up Appwrite file ${uploadedVttFileId} due to error.`);
          try {
              await deleteSubtitleFileFromAppwrite(uploadedVttFileId);
          } catch (cleanupError: any) {
              console.error(`[SubtitleService] Failed to cleanup Appwrite file ${uploadedVttFileId}: ${cleanupError.message}`);
          }
      }

      // Re-throw error (ensure it's an AppError)
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Subtitle generation failed: ${error.message}`, 500);
    } finally {
      // Final cleanup of local and GCS resources
      await this.cleanupResources(audioTempFilePath, vttTempFilePath, gcsAudioPath);
    }
  }

  /**
   * Writes VTT content to a temporary file, then delegates upload and document creation to Appwrite utils.
   * Handles potential cleanup if Appwrite document creation fails after file upload.
   */
  private async writeVttTempFileAndSaveToAppwrite(
    videoId: string,
    vttTempFilePath: string,
    vttContent: string,
    language: string,
    videoDuration: number
  ): Promise<Subtitle> {
    // Get the video document to access the name
    const { video } = await prepareVideoForProcessing(videoId);
    const subtitleName = `${video.name.split('.')[0]}_${language}.vtt`;
    // 1. Write VTT content to temporary file
    try {
      console.log(`[SubtitleService] Writing VTT content to temporary file: ${vttTempFilePath}`);
      fs.writeFileSync(vttTempFilePath, vttContent, 'utf-8');
      console.log(`[SubtitleService] Successfully wrote VTT content.`);
    } catch (error: any) {
      throw new AppError(`Failed to write VTT content to temporary file: ${error.message}`, 500);
    }

    // 2. Delegate upload and document creation to Appwrite utils
    let uploadedFileId: string | null = null;
    try {
        const uniqueFileId = ID.unique(); // Generate ID for Appwrite file
        uploadedFileId = await uploadVttToAppwrite(vttTempFilePath, uniqueFileId);

        const subtitle = await createSubtitleDocumentInAppwrite(
            videoId,
            uploadedFileId,
            language,
            videoDuration,
            subtitleName // Pass the subtitle name
        );

        // Invalidate list cache on successful creation
        try {
           const listCacheKey = `${SUBTITLE_LIST_CACHE_KEY_PREFIX}${videoId}`;
           // Use a method that maps to _deleteCacheValue, assuming deleteCachedSubtitle does this
           await redisService.deleteCachedSubtitle(listCacheKey);
           console.log(`[SubtitleService] Invalidated subtitle list cache for video ${videoId}`);
        } catch (cacheError: any) {
            console.warn(`[SubtitleService] Failed to invalidate list cache after subtitle creation for video ${videoId}: ${cacheError.message}`);
        }

        // Optionally cache the newly created subtitle directly
        try {
            // Assuming cacheSubtitle handles key generation based on subtitle ID or videoId+lang
            await redisService.cacheSubtitle(videoId, subtitle);
            console.log(`[SubtitleService] Cached newly created subtitle ${subtitle.id}`);
        } catch (cacheError: any) {
            console.warn(`[SubtitleService] Failed to cache newly created subtitle ${subtitle.id}: ${cacheError.message}`);
        }

        return subtitle;
    } catch (error: any) {
        console.error(`[SubtitleService] Error during Appwrite save process: ${error.message}`);
        // If document creation failed after file upload, attempt to clean up the file
        if (uploadedFileId && !(error instanceof AppError && error.message.includes('create subtitle document'))) {
             console.warn(`[SubtitleService] Attempting cleanup of Appwrite file ${uploadedFileId} after document creation failure.`);
             try {
                 await deleteSubtitleFileFromAppwrite(uploadedFileId);
             } catch (cleanupError: any) {
                 console.error(`[SubtitleService] Failed cleanup of Appwrite file ${uploadedFileId}: ${cleanupError.message}`);
             }
        }
        // Re-throw the original error, ensuring it's an AppError
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError(`Failed to save subtitle to Appwrite: ${error.message}`, 500);
    }
  }

  /**
   * Clean up temporary local files and remote GCS resources.
   * Delegates specific cleanup tasks where appropriate.
   */
  private async cleanupResources(
    audioTempFilePath: string | null,
    vttTempFilePath: string | null,
    gcsAudioPath: string | null
  ): Promise<void> {
    console.log(`[SubtitleService] Cleaning up resources...`);

    // Use Promise.allSettled to attempt all cleanups even if one fails
    const cleanupPromises = [];

    // Local audio file cleanup (delegate to ffmpegUtils if it handles its temps)
    if (audioTempFilePath) {
        cleanupPromises.push(
            (async () => {
                try {
                    await cleanupFfmpegTempFile(audioTempFilePath);
                    console.log(`[SubtitleService] Local audio temp file cleanup requested for: ${audioTempFilePath}`);
                } catch (error: any) {
                    console.warn(`[SubtitleService] Failed cleanup for audio temp file ${audioTempFilePath}: ${error.message}`);
                }
            })()
        );
    }

    // Local VTT file cleanup (handle directly with fs)
    if (vttTempFilePath && fs.existsSync(vttTempFilePath)) {
       cleanupPromises.push(
            (async () => {
                try {
                    await fs.promises.unlink(vttTempFilePath);
                    console.log(`[SubtitleService] Cleaned up local VTT temp file: ${vttTempFilePath}`);
                } catch (error: any) {
                    console.warn(`[SubtitleService] Failed to clean up local VTT temp file ${vttTempFilePath}: ${error.message}`);
                }
            })()
       );
    }

    // GCS audio file cleanup (delegate to gcsUtils)
    if (gcsAudioPath) {
        cleanupPromises.push(
            (async () => {
                try {
                    await deleteFromGcsUtil(gcsAudioPath);
                    console.log(`[SubtitleService] GCS audio file cleanup requested for: ${gcsAudioPath}`);
                } catch (error: any) {
                    console.warn(`[SubtitleService] Failed to delete GCS audio file ${gcsAudioPath}: ${error.message}`);
                }
            })()
        );
    }

    await Promise.allSettled(cleanupPromises);
    console.log(`[SubtitleService] Resource cleanup process finished.`);
  }

  // --- Methods for getting/deleting subtitles (Interact directly with DB/Storage via Appwrite SDK or Utils) ---

  async getSubtitleById(id: string, skipCache: boolean = false): Promise<Subtitle> {
    // Note: redisService.getCachedSubtitle likely uses a key like "subtitle:<id>" internally
    const cacheKey = `subtitle:${id}`; // Key for locking purposes

    // 1. Try cache
    if (!skipCache) {
       try {
           const cachedSubtitle = await redisService.getCachedSubtitle(id); // Use public method
           if (cachedSubtitle) {
               console.log(`[SubtitleService] Cache hit for subtitle ID: ${id}`);
               return cachedSubtitle as Subtitle; // Assuming cache stores the correct type
           }
           console.log(`[SubtitleService] Cache miss for subtitle ID: ${id}`);
       } catch (error: any) {
           if (error instanceof CacheUnavailableError) {
               console.warn(`[SubtitleService] Cache unavailable for getSubtitleById(${id}), fetching from DB.`);
           } else {
               console.error(`[SubtitleService] Non-critical cache error during getSubtitleById(${id}): ${error.message}`, error);
           }
           // Fall through
       }
    } else {
       console.log(`[SubtitleService] Skipping cache for subtitle ID: ${id}`);
    }

    // 2. Acquire lock
    const lockAcquired = await this.acquireLock(cacheKey);

    if (lockAcquired) {
       console.log(`[SubtitleService] Lock acquired for ${cacheKey}, fetching from DB.`);
       try {
           // Double-check cache after acquiring lock
           const cachedSubtitleAgain = await redisService.getCachedSubtitle(id);
           if (cachedSubtitleAgain) {
               console.log(`[SubtitleService] Cache hit for subtitle ID: ${id} after acquiring lock.`);
               await this.releaseLock(cacheKey); // Release lock before returning
               return cachedSubtitleAgain as Subtitle;
           }

           // Fetch from DB
           const subtitleDoc = await databases.getDocument(DATABASE_ID, SUBTITLES_COLLECTION_ID, id);

           const subtitleData: Subtitle = { // Map data
               id: subtitleDoc.$id,
               videoId: subtitleDoc.videoId,
               format: subtitleDoc.format,
               fileId: subtitleDoc.fileId,
               language: subtitleDoc.language,
               name: subtitleDoc.name,
               fileSize: subtitleDoc.fileSize,
               mimeType: subtitleDoc.mimeType,
               status: subtitleDoc.status,
               processingMetadata: subtitleDoc.processingMetadata,
               generatedAt: subtitleDoc.generatedAt ? new Date(subtitleDoc.generatedAt) : undefined,
               createdAt: new Date(subtitleDoc.$createdAt),
               updatedAt: new Date(subtitleDoc.$updatedAt)
           };

           // Cache the result
           try {
               // Pass videoId and subtitle data to the public caching method
               await redisService.cacheSubtitle(subtitleData.videoId, subtitleData);
               console.log(`[SubtitleService] DB result cached for subtitle ID: ${id}`);
           } catch (cacheError: any) {
               console.error(`[SubtitleService] Failed to cache DB result for subtitle ${id}: ${cacheError.message}`);
           }

           return subtitleData;

       } catch (dbError: any) {
           console.error(`[SubtitleService] Error fetching subtitle ${id} from DB:`, dbError);
           if (dbError instanceof AppwriteException && dbError.code === 404) {
               throw new AppError(`Subtitle with ID ${id} not found`, 404);
           }
           throw new AppError(`Failed to fetch subtitle ${id} from database: ${dbError.message || 'Unknown error'}`, 500);
       } finally {
           await this.releaseLock(cacheKey);
           console.log(`[SubtitleService] Lock released for ${cacheKey}`);
       }
    } else {
       // 3. Lock not acquired, wait and retry cache
       console.log(`[SubtitleService] Could not acquire lock for ${cacheKey}, waiting...`);
       for (let i = 0; i < MAX_LOCK_RETRIES; i++) {
           await delay(LOCK_RETRY_DELAY_MS);
           try {
               const cachedSubtitle = await redisService.getCachedSubtitle(id);
               if (cachedSubtitle) {
                   console.log(`[SubtitleService] Cache hit for subtitle ID: ${id} after waiting.`);
                   return cachedSubtitle as Subtitle;
               }
               console.log(`[SubtitleService] Still cache miss for subtitle ID: ${id} after wait attempt ${i + 1}`);
           } catch (error: any) {
               if (error instanceof CacheUnavailableError) {
                   console.error(`[SubtitleService] Cache became unavailable while waiting for lock on ${cacheKey}.`);
                   throw new AppError(`Cache unavailable while fetching subtitle ${id}`, 503);
               }
               console.error(`[SubtitleService] Non-critical cache error while waiting for lock on ${cacheKey}: ${error.message}`);
           }
       }
       console.error(`[SubtitleService] Failed to get subtitle ${id} from cache after waiting.`);
       throw new AppError(`Failed to retrieve subtitle ${id} after lock contention`, 503);
    }
  }

  async getSubtitlesByVideoId(videoId: string, skipCache: boolean = false): Promise<Subtitle[]> {
    const cacheKey = `${SUBTITLE_LIST_CACHE_KEY_PREFIX}${videoId}`;

    // 1. Try cache
    if (!skipCache) {
       try {
           // Need a specific method in redisService or use _getCacheValue
           const cachedResult = await redisService['_getCacheValue']<Subtitle[]>(cacheKey); // Using private method
           if (cachedResult && Array.isArray(cachedResult)) {
               console.log(`[SubtitleService] Cache hit for subtitle list for video: ${videoId}`);
               return cachedResult;
           }
           console.log(`[SubtitleService] Cache miss for subtitle list for video: ${videoId}`);
       } catch (error: any) {
           if (error instanceof CacheUnavailableError) {
               console.warn(`[SubtitleService] Cache unavailable for getSubtitlesByVideoId(${videoId}), fetching from DB.`);
           } else {
               console.error(`[SubtitleService] Non-critical cache error during getSubtitlesByVideoId(${videoId}): ${error.message}`, error);
           }
           // Fall through
       }
    } else {
       console.log(`[SubtitleService] Skipping cache for subtitle list for video: ${videoId}`);
    }

    // 2. Acquire lock
    const lockAcquired = await this.acquireLock(cacheKey);

    if (lockAcquired) {
       console.log(`[SubtitleService] Lock acquired for ${cacheKey}, fetching list from DB.`);
       try {
           // Double-check cache after acquiring lock
           const cachedResultAgain = await redisService['_getCacheValue']<Subtitle[]>(cacheKey);
           if (cachedResultAgain && Array.isArray(cachedResultAgain)) {
               console.log(`[SubtitleService] Cache hit for subtitle list ${videoId} after acquiring lock.`);
               await this.releaseLock(cacheKey); // Release lock
               return cachedResultAgain;
           }

           // Fetch from DB - Use Appwrite Query syntax
           const response = await databases.listDocuments(
               DATABASE_ID,
               SUBTITLES_COLLECTION_ID,
               [`equal("videoId", "${videoId}")`] // Correct query syntax
           );
           const subtitles: Subtitle[] = response.documents.map(doc => ({ // Map data
               id: doc.$id,
               videoId: doc.videoId,
               format: doc.format,
               fileId: doc.fileId,
               language: doc.language,
               name: doc.name,
               fileSize: doc.fileSize,
               mimeType: doc.mimeType,
               status: doc.status,
               processingMetadata: doc.processingMetadata,
               generatedAt: doc.generatedAt ? new Date(doc.generatedAt) : undefined,
               createdAt: new Date(doc.$createdAt),
               updatedAt: new Date(doc.$updatedAt)
           }));

           // Cache the result
           try {
               // Use the private setter directly as we have the final list
               await redisService['_setCacheValue'](cacheKey, subtitles);
               console.log(`[SubtitleService] DB result cached for subtitle list ${videoId}`);
           } catch (cacheError: any) {
               console.error(`[SubtitleService] Failed to cache DB result for subtitle list ${videoId}: ${cacheError.message}`);
           }

           return subtitles;

       } catch (dbError: any) {
           console.error(`[SubtitleService] Error fetching subtitles for video ${videoId} from DB:`, dbError);
           throw new AppError(`Failed to fetch subtitles for video ${videoId}: ${dbError.message || 'Unknown error'}`, 500);
       } finally {
           await this.releaseLock(cacheKey);
           console.log(`[SubtitleService] Lock released for ${cacheKey}`);
       }
    } else {
       // 3. Lock not acquired, wait and retry cache
       console.log(`[SubtitleService] Could not acquire lock for ${cacheKey}, waiting...`);
       for (let i = 0; i < MAX_LOCK_RETRIES; i++) {
           await delay(LOCK_RETRY_DELAY_MS);
           try {
               const cachedResult = await redisService['_getCacheValue']<Subtitle[]>(cacheKey);
               if (cachedResult && Array.isArray(cachedResult)) {
                   console.log(`[SubtitleService] Cache hit for subtitle list ${videoId} after waiting.`);
                   return cachedResult;
               }
               console.log(`[SubtitleService] Still cache miss for subtitle list ${videoId} after wait attempt ${i + 1}`);
           } catch (error: any) {
               if (error instanceof CacheUnavailableError) {
                   console.error(`[SubtitleService] Cache became unavailable while waiting for lock on ${cacheKey}.`);
                   throw new AppError(`Cache unavailable while fetching subtitle list for ${videoId}`, 503);
               }
               console.error(`[SubtitleService] Non-critical cache error while waiting for lock on ${cacheKey}: ${error.message}`);
           }
       }
       console.error(`[SubtitleService] Failed to get subtitle list for ${videoId} from cache after waiting.`);
       throw new AppError(`Failed to retrieve subtitle list for ${videoId} after lock contention`, 503);
    }
  }

  async getSubtitleContent(fileId: string): Promise<string> {
    try {
        // TODO: Consider caching subtitle content if frequently accessed and not excessively large
        // const cacheKey = `subtitle:content:${fileId}`;
        // let content = await redisService.getCachedSubtitleContent(fileId); // Hypothetical method
        // if (content) return content;

        // Use Appwrite SDK's direct file access instead of fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), AUDIO_PROCESSING.SUBTITLE_FETCH_TIMEOUT);

        try {
            // Get file content directly using Appwrite SDK
            const fileData = await storage.getFileView(SUBTITLES_BUCKET_ID, fileId);

            // Convert the file data (Uint8Array) to string
            const decoder = new TextDecoder('utf-8');
            const content = decoder.decode(fileData);

            return content;
        } catch (error: any) {
            if (error.name === 'AbortError') {
                throw new AppError(`Timeout while fetching subtitle file ${fileId}`, 408);
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    } catch (error: any) {
        console.error(`[SubtitleService] Error getting subtitle content: ${error.message}`, error);
        throw new AppError(`Failed to get subtitle content for file ${fileId}: ${error.message}`, 500);
    }
  }

  async deleteSubtitle(id: string): Promise<void> {
    let subtitleFileId: string | null = null;
    try {
      const subtitle = await this.getSubtitleById(id);
      subtitleFileId = subtitle.fileId;

      await deleteSubtitleFileFromAppwrite(subtitleFileId);
      await deleteSubtitleDocumentFromAppwrite(id);

      // Invalidate caches
      try {
          // Fetch subtitle before deleting to get videoId for list invalidation
          // Use skipCache=true as we are deleting it anyway
          const subtitle = await this.getSubtitleById(id, true);
          await redisService.deleteCachedSubtitle(id); // Invalidate specific subtitle cache (uses ID)
          const listCacheKey = `${SUBTITLE_LIST_CACHE_KEY_PREFIX}${subtitle.videoId}`;
          // Use private method to delete the list key directly
          await redisService['_deleteCacheValue'](listCacheKey);
          console.log(`[SubtitleService] Invalidated cache for subtitle ${id} and list ${listCacheKey}`);
      } catch (fetchOrCacheError: any) {
           // Log error if fetching subtitle for invalidation failed or if invalidation itself failed
           console.warn(`[SubtitleService] Failed during cache invalidation process for subtitle ${id}: ${fetchOrCacheError.message}`);
      }

      console.log(`[SubtitleService] Successfully deleted subtitle ${id}`);
    } catch (error: any) {
      let errorMessage = `Failed to delete subtitle ${id}`;
      if (subtitleFileId) errorMessage += ` (file: ${subtitleFileId})`;

      if (error instanceof AppError) {
         throw new AppError(`${errorMessage}: ${error.message}`, error.statusCode);
       }
      throw new AppError(`${errorMessage}: ${error.message}`, 500);
    }
  }
  /**
   * Orchestrates the generation of subtitles for a video as part of a background job.
   * This method is intended to be called from the backgroundJobService worker.
   *
   * @param videoId The ID of the video to generate subtitles for
   * @param language The language code for the subtitles
   * @param job The BullMQ job object for reporting progress
   * @returns The generated subtitle object
   */
  async generateSubtitlesForJob(
    videoId: string,
    language: string = 'en',
    job: Job
  ): Promise<Subtitle> {
    console.log(`[SubtitleService] Orchestrating subtitle generation for video ${videoId} as background job ${job.id}`);

    let audioTempFilePath: string | null = null;
    let gcsAudioPath: string | null = null;
    let vttTempFilePath: string | null = null;
    let uploadedVttFileId: string | null = null; // Track Appwrite file ID for cleanup on error

    try {
      // Update job progress
      await job.updateProgress({ stage: 'preparing', progress: 10, message: 'Preparing video for processing' });

      // Step 1: Prepare video (validation, get stream) - Delegate
      const { video, videoStream } = await prepareVideoForProcessing(videoId);

      // Update job progress
      await job.updateProgress({ stage: 'extracting_audio', progress: 20, message: 'Extracting audio from video' });

      // Step 2: Extract audio - Delegate
      console.log(`[SubtitleService] Requesting audio extraction...`);
      const { tempFilePath: audioPath, mimeType } = await extractAudio(videoStream, AUDIO_PROCESSING.FORMAT, {
          audioFrequency: AUDIO_PROCESSING.FREQUENCY,
          audioChannels: AUDIO_PROCESSING.CHANNELS,
          logLevel: AUDIO_PROCESSING.LOG_LEVEL
      });
      audioTempFilePath = audioPath;
      console.log(`[SubtitleService] Audio extracted to ${audioTempFilePath}`);

      // Update job progress
      await job.updateProgress({ stage: 'uploading_audio', progress: 40, message: 'Uploading audio to cloud storage' });

      // Step 3: Upload audio to GCS - Delegate
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const gcsFileName = `audio/${videoId}/${timestamp}.${AUDIO_PROCESSING.FORMAT}`;
      console.log(`[SubtitleService] Requesting audio upload to GCS as ${gcsFileName}...`);
      const gcsUri = await uploadToGcsUtil(audioTempFilePath, gcsFileName, {
          contentType: mimeType,
          metadata: {
            videoId: video.id,
            language,
            videoName: video.name,
            sourceType: 'gemini-transcription',
            model: AUDIO_PROCESSING.GEMINI_MODEL
          }
      });
      gcsAudioPath = gcsFileName; // Store GCS path for cleanup
      console.log(`[SubtitleService] Audio uploaded to GCS: ${gcsUri}`);

      // Update job progress
      await job.updateProgress({ stage: 'transcribing', progress: 60, message: 'Generating transcription with Gemini' });

      // Step 4: Generate transcription - Delegate
      const rawTranscription = await generateTranscriptionViaGemini(gcsUri, language, mimeType);

      // Update job progress
      await job.updateProgress({ stage: 'formatting', progress: 80, message: 'Formatting transcription to VTT' });

      // Step 5: Format transcription to VTT - Delegate
      const vttContent = VttFormatter.formatRawTranscriptionToVTT(rawTranscription);
      console.log(`[SubtitleService] VTT content generated (${Math.round(vttContent.length / 1024)}KB)`);

      // Update job progress
      await job.updateProgress({ stage: 'saving', progress: 90, message: 'Saving subtitle to storage' });

      // Step 6: Write VTT temp file and save to Appwrite - Delegate parts
      vttTempFilePath = path.join(path.dirname(audioTempFilePath), `subtitle_${videoId}_${timestamp}.vtt`);
      const result = await this.writeVttTempFileAndSaveToAppwrite(
          videoId,
          vttTempFilePath,
          vttContent,
          language,
          video.duration || 0
      );
      uploadedVttFileId = result.fileId; // Store for potential cleanup if subsequent steps fail (though none currently)

      // Update job progress
      await job.updateProgress({ stage: 'completed', progress: 100, message: 'Subtitle generation completed' });

      console.log(`[SubtitleService] Subtitle generation completed successfully for video ${videoId}. Subtitle ID: ${result.id}`);
      return result;

    } catch (error: any) {
      console.error(`[SubtitleService] Orchestration failed: ${error.message}`, error.stack);

      // Attempt to clean up Appwrite file if it was uploaded before the error occurred
      if (uploadedVttFileId) {
          console.warn(`[SubtitleService] Attempting to clean up Appwrite file ${uploadedVttFileId} due to error.`);
          try {
              await deleteSubtitleFileFromAppwrite(uploadedVttFileId);
          } catch (cleanupError: any) {
              console.error(`[SubtitleService] Failed to cleanup Appwrite file ${uploadedVttFileId}: ${cleanupError.message}`);
          }
      }

      // Re-throw error (ensure it's an AppError)
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Subtitle generation failed: ${error.message}`, 500);
    } finally {
      // Final cleanup of local and GCS resources
      await this.cleanupResources(audioTempFilePath, vttTempFilePath, gcsAudioPath);
    }
  }

  /**
   * Creates a placeholder subtitle document with PENDING status.
   * This is used when starting a background job to provide immediate feedback to the client.
   *
   * @param videoId The ID of the video
   * @param language The language code
   * @returns The created subtitle document ID
   */
  async createPendingSubtitleDocument(videoId: string, language: string): Promise<string> {
    try {
      console.log(`[SubtitleService] Creating pending subtitle document for video ${videoId}`);

      // First, check if the video exists in the database without trying to fetch the file
      // This avoids the 404 error when the file is missing but we have the video metadata
      const video = await videoService.getVideoById(videoId);
      if (!video) {
        throw new AppError(`Video with ID ${videoId} not found`, 404);
      }

      // Create a default subtitle name without trying to access the file
      const subtitleName = `${video.name.split('.')[0]}_${language}.vtt`;

      const documentId = ID.unique();
      const subtitleDocData = {
        videoId,
        fileId: '', // Will be updated when the file is uploaded
        format: SubtitleFormat.VTT,
        language,
        name: subtitleName, // Add the name attribute
        fileSize: 0, // Add fileSize attribute with default value of 0 (will be updated later)
        mimeType: 'text/vtt', // Add mimeType attribute for VTT format
        status: SubtitleGenerationStatus.PENDING,
        processingMetadata: JSON.stringify({
          model: AUDIO_PROCESSING.GEMINI_MODEL,
          audioFormat: AUDIO_PROCESSING.FORMAT,
          queuedAt: new Date().toISOString()
        })
      };

      // Validate the document before creating it
      validateSubtitleDocument(subtitleDocData);

      const subtitleDoc = await databases.createDocument(
        DATABASE_ID,
        SUBTITLES_COLLECTION_ID,
        documentId,
        subtitleDocData,
        createDocumentPermissions()
      );

      console.log(`[SubtitleService] Created pending subtitle document: ${subtitleDoc.$id}`);
      return subtitleDoc.$id;
    } catch (error: any) {
      console.error(`[SubtitleService] Failed to create pending subtitle document: ${error.message}`);
      throw new AppError(`Failed to create pending subtitle document: ${error.message}`, 500);
    }
  }

  /**
   * Updates the status of a subtitle document.
   *
   * @param documentId The ID of the subtitle document
   * @param status The new status
   * @param fileId Optional file ID if the subtitle file has been uploaded
   * @param errorMessage Optional error message if the status is FAILED
   */
  async updateSubtitleStatus(
    documentId: string,
    status: SubtitleGenerationStatus,
    fileId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      console.log(`[SubtitleService] Updating subtitle document ${documentId} status to ${status}`);

      const updateData: Record<string, any> = { status };

      if (fileId) {
        updateData.fileId = fileId;
      }

      if (status === SubtitleGenerationStatus.FAILED && errorMessage) {
        // Update the processingMetadata to include the error message
        const subtitle = await this.getSubtitleById(documentId);
        const metadata = subtitle.processingMetadata ? JSON.parse(subtitle.processingMetadata) : {};
        metadata.error = errorMessage;
        metadata.failedAt = new Date().toISOString();
        updateData.processingMetadata = JSON.stringify(metadata);
      } else if (status === SubtitleGenerationStatus.COMPLETED) {
        // Update the processingMetadata to include the completion time
        const subtitle = await this.getSubtitleById(documentId);
        const metadata = subtitle.processingMetadata ? JSON.parse(subtitle.processingMetadata) : {};
        metadata.completedAt = new Date().toISOString();
        updateData.processingMetadata = JSON.stringify(metadata);
        updateData.generatedAt = new Date().toISOString();
      }

      await databases.updateDocument(
        DATABASE_ID,
        SUBTITLES_COLLECTION_ID,
        documentId,
        updateData
      );

      console.log(`[SubtitleService] Updated subtitle document ${documentId} status to ${status}`);

      // Invalidate relevant caches on status update
      try {
          // Fetch fresh data to get videoId for list invalidation, skip cache as data might be stale
          const subtitle = await this.getSubtitleById(documentId, true);
          await redisService.deleteCachedSubtitle(documentId); // Invalidate specific subtitle cache (uses ID)
          const listCacheKey = `${SUBTITLE_LIST_CACHE_KEY_PREFIX}${subtitle.videoId}`;
          // Use private method to delete the list key directly
          await redisService['_deleteCacheValue'](listCacheKey);
          console.log(`[SubtitleService] Invalidated cache for subtitle ${documentId} and list ${listCacheKey} after status update`);
      } catch (fetchOrCacheError: any) {
           // Log error if fetching subtitle for invalidation failed or if invalidation itself failed
           console.warn(`[SubtitleService] Failed during cache invalidation after status update for subtitle ${documentId}: ${fetchOrCacheError.message}`);
      }

    } catch (error: any) {
      console.error(`[SubtitleService] Failed to update subtitle status: ${error.message}`);
      throw new AppError(`Failed to update subtitle status: ${error.message}`, 500);
    }
  }
}

// Export a singleton instance
export default new SubtitleService();