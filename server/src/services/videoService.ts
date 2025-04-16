import { ID } from 'node-appwrite';
import {
  storage,
  databases,
  VIDEOS_BUCKET_ID,
  VIDEOS_COLLECTION_ID,
  DATABASE_ID,
  createDocumentPermissions,
  createFilePermissions
} from '../config/appwrite';
// Import redisService for all cache operations
import { InputFile } from 'node-appwrite/file';
import { Video } from '../types';
import { AppError } from '../middleware/errorHandler';
import redisService, { CacheUnavailableError, CacheOperationError } from './redisService'; // Import custom errors
import { AppwriteException } from 'node-appwrite'; // Import AppwriteException
import { redisClient, DEFAULT_EXPIRATION_TIME } from '../config/redis'; // Import redisClient and TTL for locking

// Helper function for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Constants for locking
const LOCK_TIMEOUT_MS = 5000; // 5 seconds lock expiration
const LOCK_RETRY_DELAY_MS = 100; // Wait 100ms before retrying cache read
const MAX_LOCK_RETRIES = 5; // Max attempts to get data after waiting for lock
const VIDEO_LIST_CACHE_KEY = 'video:list'; // Define a constant for the list cache key

/**
 * Service for handling video operations, including caching with stampede protection.
 */
export class VideoService {
  /**
   * Initialize a video upload
   * @param fileName Original file name
   * @param fileSize File size in bytes
   * @param mimeType File MIME type
   * @param language Optional language code (e.g., 'en', 'es')
   */
  async initializeUpload(fileName: string, fileSize: number, mimeType: string, language?: string): Promise<Video> { // Add language parameter
    try {
      // Validate file type
      if (!mimeType.startsWith('video/')) {
        throw new AppError('Invalid file type. Only video files are allowed.', 400);
      }

      // Validate file size (up to 4GB)
      const MAX_FILE_SIZE = 4 * 1024 * 1024 * 1024; // 4GB in bytes
      if (fileSize > MAX_FILE_SIZE) {
        throw new AppError(`File size exceeds the maximum limit of 4GB.`, 400);
      }

      // Extract format from mimeType (e.g., "video/mp4" -> "mp4")
      const format = mimeType.split('/')[1];
      if (!format) {
        console.warn(`Could not determine format from mimeType: ${mimeType}. Using 'unknown'.`);
      }

      // Create a unique ID for the video document itself
      const videoId = ID.unique();
      // Create a separate unique file ID for Appwrite storage
      const fileId = ID.unique();

      // Create video entry in database with proper arguments
      const videoDoc = await databases.createDocument(
        DATABASE_ID,
        VIDEOS_COLLECTION_ID,
        videoId, // Use the generated videoId as the document ID
        {
          videoId: videoId, // Add the required videoId attribute
          name: fileName,
          fileSize,
          mimeType,
          videoFormat: format || 'unknown', // Use videoFormat to store the video format string
          language: language || 'unknown', // Add the language attribute, default to 'unknown'
          fileId, // Keep the separate fileId for storage reference
          status: 'initialized'
        },
        createDocumentPermissions() // Use the permission helper function
      );

      console.log('Appwrite createDocument response:', JSON.stringify(videoDoc, null, 2));
      if (!videoDoc || !videoDoc.$id) {
        console.error('CRITICAL: Appwrite document created but $id is missing!', videoDoc);
        throw new AppError('Failed to initialize upload: Appwrite returned invalid document structure.', 500);
      }

      const videoData: Video = { // Ensure type matches interface
        id: videoDoc.$id, // Map Appwrite's $id to our 'id' (which is now videoId)
        videoId: videoDoc.videoId, // Include videoId from the document data
        name: videoDoc.name,
        fileSize: videoDoc.fileSize,
        mimeType: videoDoc.mimeType,
        videoFormat: videoDoc.videoFormat, // Use videoFormat from the document data
        language: videoDoc.language, // Include language from the document data
        fileId: videoDoc.fileId,
        status: videoDoc.status,
        createdAt: new Date(videoDoc.$createdAt), // Use Appwrite's built-in system field
        updatedAt: new Date(videoDoc.$updatedAt)  // Use Appwrite's built-in system field
      };

      console.log('Mapped Video object to return:', JSON.stringify(videoData, null, 2));

      return videoData; // Return the mapped object
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error initializing upload:', error);
      // Add more specific error details if available
      const message = error instanceof AppwriteException ? error.message : (error.message || 'Unknown error');
      const code = error instanceof AppwriteException ? error.code : 500;
      throw new AppError(`Failed to initialize video upload: ${message}`, code);
    }
  }

  /**
   * Handle file upload buffer directly to Appwrite storage
   * @param videoId The video document ID
   * @param fileBuffer Buffer containing the file content
   * @param fileName Original file name (for Appwrite metadata)
   * @param _fileSize File size (unused but kept for API compatibility)
   * @param _mimeType File MIME type (unused but kept for API compatibility)
   */
  async handleFileUpload(
    videoId: string,
    fileBuffer: Buffer, // Accept Buffer instead of Readable stream
    fileName: string,
    _fileSize: number,
    _mimeType: string
  ): Promise<Video> {
    let video: Video | null = null; // To store fetched video data
    try {
      // Get the video document to access the fileId and verify status
      video = await this.getVideoById(videoId, true); // Skip cache
      if (video.status !== 'initialized') {
          throw new AppError(`Video ${videoId} is not in initialized state (current: ${video.status}). Cannot upload.`, 409);
      }

      console.log(`Uploading file buffer directly to Appwrite for fileId: ${video.fileId}`);

      // Create InputFile directly from the buffer
      const inputFile = InputFile.fromBuffer(fileBuffer, fileName);

      // Upload the buffer to Appwrite storage
      const uploadedFile = await storage.createFile(
        VIDEOS_BUCKET_ID,
        video.fileId, // Use the fileId stored in the video document
        inputFile,
        createFilePermissions()
      );
      console.log('File buffer uploaded to Appwrite storage:', uploadedFile.$id);

      // Update the video document status to 'uploaded'
      const updatedVideoDoc = await databases.updateDocument(
        DATABASE_ID,
        VIDEOS_COLLECTION_ID,
        videoId,
        { status: 'uploaded' },
        createDocumentPermissions()
      );
      console.log('Video document updated in database');

      // Invalidate relevant caches
      try {
        await redisService.deleteCachedVideo(videoId); // Invalidate specific video
        // Invalidate the list cache using the constant key
        await redisService.deleteCachedVideo(VIDEO_LIST_CACHE_KEY);
        console.log(`Cache invalidated after upload for video ${videoId} and list`);
      } catch (cacheError: any) {
         console.warn(`Failed to invalidate cache during file upload for video ${videoId}: ${cacheError.message}`);
         // Non-critical, log and continue
      }

      // Return the updated video data, mapped from the updated document
      const updatedVideoData: Video = {
        id: updatedVideoDoc.$id,
        videoId: updatedVideoDoc.videoId,
        name: updatedVideoDoc.name,
        fileSize: updatedVideoDoc.fileSize,
        mimeType: updatedVideoDoc.mimeType,
        videoFormat: updatedVideoDoc.videoFormat,
        language: updatedVideoDoc.language,
        duration: updatedVideoDoc.duration, // Duration might be added later
        fileId: updatedVideoDoc.fileId,
        status: updatedVideoDoc.status,
        createdAt: new Date(updatedVideoDoc.$createdAt),
        updatedAt: new Date(updatedVideoDoc.$updatedAt)
      };
      return updatedVideoData;

    } catch (error: any) {
        console.error('Error during direct file upload from buffer:', error);

        // Attempt to update status to 'upload_failed' if video doc exists
        if (video) {
            try {
                await databases.updateDocument(
                    DATABASE_ID,
                    VIDEOS_COLLECTION_ID,
                    videoId,
                    { status: 'upload_failed' },
                    createDocumentPermissions()
                );
                console.log(`Video document ${videoId} status updated to 'upload_failed'.`);
            } catch (updateError: any) {
                console.error(`Failed to update video document ${videoId} status after upload error: ${updateError.message}`);
            }
        }

        // Re-throw specific Appwrite errors or a generic one
        if (error instanceof AppwriteException) {
             throw new AppError(`Appwrite error during upload: ${error.message}`, error.code || 500);
        } else if (error instanceof AppError) {
            throw error; // Re-throw existing AppErrors (like status conflict)
        } else {
            throw new AppError(`Failed to handle file upload from buffer: ${error.message || 'Unknown error'}`, 500);
        }
    }
  }

  /**
   * Get a readable stream for a video file from storage
   * @param fileId The file ID in storage
   * @returns A Promise that resolves to a Node.js Readable stream
   */
  async getVideoStream(fileId: string): Promise<NodeJS.ReadableStream> {
    try {
      console.log(`Getting video stream for fileId: ${fileId}`);

      // Construct the direct URL
      const appwriteEndpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
      const baseUrl = appwriteEndpoint.endsWith('/') ? appwriteEndpoint.slice(0, -1) : appwriteEndpoint;
      const directUrl = `${baseUrl}/storage/buckets/${VIDEOS_BUCKET_ID}/files/${fileId}/download`;

      console.log(`Constructed direct download URL: ${directUrl}`);

      // Add authentication headers
      const headers: Record<string, string> = {
        'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID || '',
        'X-Appwrite-Key': process.env.APPWRITE_API_KEY || ''
      };

      // Fetch the file using node-fetch (ensure fetch is available/imported if needed)
      const response = await fetch(directUrl, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch video: HTTP ${response.status} ${response.statusText}`);
      }
      if (!response.body) {
        throw new Error('Response body is null or undefined');
      }

      return response.body as unknown as NodeJS.ReadableStream;
    } catch (error: any) {
      console.error('Error getting video stream:', error);
      throw new AppError(`Failed to get video stream: ${error.message || 'Unknown error'}`, 500);
    }
  }

  /**
   * Get video file metadata (content type, size, etc.)
   * @param fileId The file ID in storage
   * @returns Promise with the file metadata
   */
  async getVideoFileMetadata(fileId: string): Promise<{ mimeType: string; size: number; name: string }> {
    try {
      const file = await storage.getFile(VIDEOS_BUCKET_ID, fileId);
      return {
        mimeType: file.mimeType,
        size: file.sizeOriginal,
        name: file.name
      };
    } catch (error: any) {
      console.error('Error getting video file metadata:', error);
      throw new AppError(`Failed to get video file metadata: ${error.message || 'Unknown error'}`, 500);
    }
  }

  /**
   * Get video download URL
   * @param videoId The video document ID
   * @returns Promise with the download URL
   */
  async getVideoDownloadUrl(videoId: string): Promise<string> {
    try {
      console.log(`Getting download URL for video ID: ${videoId}`);
      const video = await this.getVideoById(videoId); // Use the caching version

      if (!video || !video.fileId) {
        throw new AppError(`Invalid video or missing fileId for video ID: ${videoId}`, 404); // Use 404
      }

      console.log(`Found video with fileId: ${video.fileId}`);

      // Construct the URL directly
      const appwriteEndpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
      const baseUrl = appwriteEndpoint.endsWith('/') ? appwriteEndpoint.slice(0, -1) : appwriteEndpoint;
      const directUrl = `${baseUrl}/storage/buckets/${VIDEOS_BUCKET_ID}/files/${video.fileId}/download`;

      console.log(`Constructed direct download URL: ${directUrl}`);
      return directUrl;
    } catch (error: any) {
      console.error('Error getting video download URL:', error);
      // Propagate specific errors if needed
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to get video download URL: ${error.message || 'Unknown error'}`, 500);
    }
  }

  /**
   * Delete video and its file from storage
   * @param id Video document ID
   */
  async deleteVideo(id: string): Promise<void> {
    try {
      const video = await this.getVideoById(id, true); // Skip cache for deletion consistency

      // Delete the file from storage
      await storage.deleteFile(VIDEOS_BUCKET_ID, video.fileId);

      // Delete the document from database
      await databases.deleteDocument(
        DATABASE_ID,
        VIDEOS_COLLECTION_ID,
        id
      );

      // Invalidate caches - Wrap in try/catch
      try {
        await redisService.deleteCachedVideo(id);
        await redisService.deleteCachedSubtitle(id);
        // Invalidate the list cache using the constant key
        await redisService.deleteCachedVideo(VIDEO_LIST_CACHE_KEY);
        console.log(`Cache invalidated for deleted video ${id} and list`);
      } catch (cacheError: any) {
         console.warn(`Failed to invalidate cache during video deletion for ${id}: ${cacheError.message}`);
      }

      // Clean up any file hashes that reference this video
      await this.cleanupFileHashesForVideo(id);

    } catch (error: any) {
      console.error('Error deleting video:', error);
      // Handle Appwrite not found specifically
      if (error instanceof AppwriteException && error.code === 404) {
         console.warn(`Video ${id} already deleted or not found during deletion attempt.`);
         // Optionally invalidate cache again just in case
         try { await redisService.deleteCachedVideo(id); await redisService.deleteCachedVideo(VIDEO_LIST_CACHE_KEY); } catch {}
         return; // Don't throw error if already deleted
      }
      if (error instanceof AppError && error.statusCode === 404) {
         console.warn(`Video ${id} not found via getVideoById during deletion attempt.`);
         return; // Don't throw error if already deleted
      }
      throw new AppError(`Failed to delete video: ${error.message || 'Unknown error'}`, 500);
    }
  }

  /**
   * Clean up any file hashes that reference a specific video
   * @param videoId The ID of the video
   */
  private async cleanupFileHashesForVideo(videoId: string): Promise<void> {
    try {
      if (!redisService.isConnected()) { // Use the service's method
        console.warn(`Redis not ready, skipping file hash cleanup for video ${videoId}`);
        return;
      }

      console.log(`Cleaning up file hashes for deleted video ${videoId}`);
      let removedCount = 0;
      let cursor = '0';
      const pattern = 'file:hash:*'; // Match all file hashes

      do {
        // Use redisClient directly for SCAN as it's not wrapped in redisService yet
        const reply = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
        cursor = reply[0];
        const keys = reply[1];

        if (keys.length === 0) continue;

        // Get all values for the found keys in one pipeline
        const pipeline = redisClient.pipeline();
        keys.forEach(key => pipeline.get(key));
        const values = await pipeline.exec(); // Returns [error, value][]

        const keysToDelete: string[] = [];
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const result = values?.[i];
          // Ensure result exists, has no error (index 0), and has a value (index 1)
          if (result && !result[0] && result[1] !== null && result[1] !== undefined) {
             const valueStr = result[1]; // Get the potential string value
             // Explicitly check if it's a string before parsing
             if (typeof valueStr === 'string') {
                 try {
                   const data = JSON.parse(valueStr);
                   if (data && data.videoId === videoId) { // Check data exists after parse
                     keysToDelete.push(key);
                     removedCount++;
                     console.log(`Identified file hash ${key.substring(10)} referencing deleted video ${videoId}`);
                   }
                 } catch (e) {
                   console.warn(`Error parsing JSON for key ${key}:`, e);
                 }
             } else {
                console.warn(`Value for key ${key} is not a string:`, valueStr);
             }
          }
        }

        // Delete the identified keys in one go
        if (keysToDelete.length > 0) {
           await redisClient.del(keysToDelete);
           console.log(`Removed ${keysToDelete.length} file hash keys referencing video ${videoId}`);
        }

      } while (cursor !== '0');

      if (removedCount > 0) {
        console.log(`Finished cleanup: Removed ${removedCount} file hash reference(s) for deleted video ${videoId}`);
      } else {
        console.log(`No file hashes found referencing deleted video ${videoId}`);
      }
    } catch (error) {
      console.error(`Error cleaning up file hashes for video ${videoId}:`, error);
      // Don't throw, just log the error
    }
  }

  // --- Private Lock Helper ---
  private async acquireLock(key: string): Promise<boolean> {
    const lockKey = `${key}:lock`;
    try {
      // Use standard arguments for SET: key, value, [mode], [duration], [condition]
      // PX = milliseconds, NX = set only if not exists
      // Note: ioredis types might still complain, but this is the standard command structure
      const result = await redisClient.set(lockKey, 'locked', 'PX', LOCK_TIMEOUT_MS, 'NX');
      return result === 'OK';
    } catch (error) {
      console.error(`Error acquiring lock for key ${key}:`, error);
      return false; // Failed to acquire lock
    }
  }

  private async releaseLock(key: string): Promise<void> {
    const lockKey = `${key}:lock`;
    try {
      await redisClient.del(lockKey);
    } catch (error) {
      console.error(`Error releasing lock for key ${key}:`, error);
      // Log error but don't throw, lock will expire eventually
    }
  }
  // --- End Lock Helper ---


  /**
   * Get video by ID with cache stampede protection.
   * @param id Video ID
   * @param skipCache Whether to skip the cache and fetch directly from the database
   * @throws {AppError} If video not found or critical error occurs.
   * @throws {CacheUnavailableError | CacheOperationError} If Redis operations fail critically.
   */
  async getVideoById(id: string, skipCache: boolean = false): Promise<Video> {
    const cacheKey = `video:${id}`; // Use the actual key generation logic if different

    // 1. Try fetching from cache if allowed
    if (!skipCache) {
      try {
        const cachedVideo = await redisService.getCachedVideo(id);
        if (cachedVideo) {
          console.log(`Cache hit for video ID: ${id}`);
          return cachedVideo;
        }
        console.log(`Cache miss for video ID: ${id}`);
      } catch (error: any) {
        if (error instanceof CacheUnavailableError) {
          console.warn(`Cache unavailable for getVideoById(${id}), fetching from DB directly.`);
          // Proceed to DB fetch without locking as cache is down
        } else {
          // Log other cache errors but proceed to DB fetch as a fallback
          console.error(`Non-critical cache error during getVideoById(${id}): ${error.message}`, error);
        }
        // Fall through to DB fetch
      }
    } else {
       console.log(`Skipping cache for video ID: ${id}`);
    }


    // 2. Try to acquire lock before hitting the database
    const lockAcquired = await this.acquireLock(cacheKey);

    if (lockAcquired) {
      console.log(`Lock acquired for ${cacheKey}, fetching from DB.`);
      try {
        // Double-check cache after acquiring lock (another process might have finished)
        const cachedVideoAgain = await redisService.getCachedVideo(id);
        if (cachedVideoAgain) {
          console.log(`Cache hit for video ID: ${id} after acquiring lock.`);
          return cachedVideoAgain;
        }

        // Fetch from database
        const videoDoc = await databases.getDocument(
          DATABASE_ID,
          VIDEOS_COLLECTION_ID,
          id
        );

        const videoData: Video = { // Map the data
          id: videoDoc.$id,
          videoId: videoDoc.videoId,
          name: videoDoc.name,
          fileSize: videoDoc.fileSize,
          mimeType: videoDoc.mimeType,
          videoFormat: videoDoc.videoFormat,
          language: videoDoc.language,
          duration: videoDoc.duration,
          fileId: videoDoc.fileId,
          status: videoDoc.status,
          createdAt: new Date(videoDoc.$createdAt),
          updatedAt: new Date(videoDoc.$updatedAt)
        };

        // Cache the result before releasing lock
        try {
          await redisService.cacheVideo(videoData); // Use default TTL from redisService
          console.log(`DB result cached for video ID: ${id}`);
        } catch (cacheError: any) {
           console.error(`Failed to cache DB result for video ${id}: ${cacheError.message}`);
           // Don't fail the request, but log the caching error
        }

        return videoData; // Return data fetched from DB

      } catch (dbError: any) {
        console.error(`Error fetching video ${id} from DB:`, dbError);
        // Handle Appwrite not found specifically
        if (dbError instanceof AppwriteException && dbError.code === 404) {
           throw new AppError(`Video not found with ID: ${id}`, 404);
        }
        throw new AppError(`Failed to fetch video ${id} from database: ${dbError.message || 'Unknown error'}`, 500);
      } finally {
        // Always release the lock
        await this.releaseLock(cacheKey);
        console.log(`Lock released for ${cacheKey}`);
      }
    } else {
      // 3. Lock not acquired, wait and retry cache
      console.log(`Could not acquire lock for ${cacheKey}, waiting...`);
      for (let i = 0; i < MAX_LOCK_RETRIES; i++) {
        await delay(LOCK_RETRY_DELAY_MS);
        try {
          const cachedVideo = await redisService.getCachedVideo(id);
          if (cachedVideo) {
            console.log(`Cache hit for video ID: ${id} after waiting for lock.`);
            return cachedVideo;
          }
          console.log(`Still cache miss for video ID: ${id} after wait attempt ${i + 1}`);
        } catch (error: any) {
           // If cache becomes unavailable while waiting, we might need to give up or try DB directly
           if (error instanceof CacheUnavailableError) {
              console.error(`Cache became unavailable while waiting for lock on ${cacheKey}. Cannot retrieve data.`);
              throw new AppError(`Cache unavailable while fetching video ${id}`, 503); // Service Unavailable
           }
           console.error(`Non-critical cache error while waiting for lock on ${cacheKey}: ${error.message}`);
           // Continue retrying cache for now
        }
      }

      // If still not found after retries, throw an error
      console.error(`Failed to get video ${id} from cache after waiting for lock.`);
      throw new AppError(`Failed to retrieve video ${id} after lock contention`, 503); // Service Unavailable or Timeout
    }
  }

  /**
   * List all videos with cache stampede protection.
   * @param skipCache Whether to skip the cache and fetch directly from the database
   * @throws {AppError} If listing fails critically.
   * @throws {CacheUnavailableError | CacheOperationError} If Redis operations fail critically.
   */
   async listVideos(skipCache: boolean = false): Promise<Video[]> {
    const cacheKey = VIDEO_LIST_CACHE_KEY; // Use constant key

    // 1. Try fetching from cache if allowed
    if (!skipCache) {
        try {
            // Use the generic get method, expecting a Video array
            const cachedResult = await redisService['_getCacheValue']<Video[]>(cacheKey); // Use private getter
            if (cachedResult && Array.isArray(cachedResult)) {
                console.log('Cache hit for video list');
                return cachedResult;
            }
            console.log('Cache miss for video list');
        } catch (error: any) {
            if (error instanceof CacheUnavailableError) {
                console.warn(`Cache unavailable for listVideos, fetching from DB directly.`);
            } else {
                console.error(`Non-critical cache error during listVideos: ${error.message}`, error);
            }
            // Fall through to DB fetch
        }
    } else {
        console.log(`Skipping cache for video list`);
    }

    // 2. Try to acquire lock before hitting the database
    const lockAcquired = await this.acquireLock(cacheKey);

    if (lockAcquired) {
        console.log(`Lock acquired for ${cacheKey}, fetching list from DB.`);
        try {
            // Double-check cache after acquiring lock
            const cachedResultAgain = await redisService['_getCacheValue']<Video[]>(cacheKey);
            if (cachedResultAgain && Array.isArray(cachedResultAgain)) {
                console.log('Cache hit for video list after acquiring lock.');
                return cachedResultAgain;
            }

            // Fetch from database
            const response = await databases.listDocuments(
                DATABASE_ID,
                VIDEOS_COLLECTION_ID
            );

            const videos: Video[] = response.documents.map(doc => ({ // Map data
                id: doc.$id,
                videoId: doc.videoId,
                name: doc.name,
                fileSize: doc.fileSize,
                mimeType: doc.mimeType,
                videoFormat: doc.videoFormat,
                language: doc.language,
                duration: doc.duration,
                fileId: doc.fileId,
                status: doc.status,
                createdAt: new Date(doc.$createdAt),
                updatedAt: new Date(doc.$updatedAt)
            }));

            // Cache the result (the array itself) before releasing lock
            try {
                await redisService['_setCacheValue'](cacheKey, videos); // Use private setter
                console.log(`DB result cached for video list`);
            } catch (cacheError: any) {
                console.error(`Failed to cache DB result for video list: ${cacheError.message}`);
            }

            return videos; // Return data fetched from DB

        } catch (dbError: any) {
            console.error('Error listing videos from DB:', dbError);
            throw new AppError(`Failed to list videos from database: ${dbError.message || 'Unknown error'}`, 500);
        } finally {
            // Always release the lock
            await this.releaseLock(cacheKey);
            console.log(`Lock released for ${cacheKey}`);
        }
    } else {
        // 3. Lock not acquired, wait and retry cache
        console.log(`Could not acquire lock for ${cacheKey}, waiting...`);
        for (let i = 0; i < MAX_LOCK_RETRIES; i++) {
            await delay(LOCK_RETRY_DELAY_MS);
            try {
                const cachedResult = await redisService['_getCacheValue']<Video[]>(cacheKey); // Retry cache read
                 if (cachedResult && Array.isArray(cachedResult)) {
                    console.log(`Cache hit for video list after waiting for lock.`);
                    return cachedResult;
                }
                console.log(`Still cache miss for video list after wait attempt ${i + 1}`);
            } catch (error: any) {
                 if (error instanceof CacheUnavailableError) {
                    console.error(`Cache became unavailable while waiting for lock on ${cacheKey}. Cannot retrieve list.`);
                    throw new AppError(`Cache unavailable while fetching video list`, 503);
                 }
                 console.error(`Non-critical cache error while waiting for lock on ${cacheKey}: ${error.message}`);
            }
        }

        // If still not found after retries, throw an error
        console.error(`Failed to get video list from cache after waiting for lock.`);
        throw new AppError(`Failed to retrieve video list after lock contention`, 503);
    }
  }
}

// Export a singleton instance
export default new VideoService();