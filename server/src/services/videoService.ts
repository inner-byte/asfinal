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
import redisService from './redisService'; // Keep for other methods like deleteCachedVideo etc.
import { AppwriteException } from 'node-appwrite'; // Import AppwriteException

/**
 * Service for handling video operations
 */
export class VideoService {
  /**
   * Initialize a video upload
   * @param fileName Original file name
   * @param fileSize File size in bytes
   * @param mimeType File MIME type
   */
  async initializeUpload(fileName: string, fileSize: number, mimeType: string): Promise<Video> {
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

      // Create a unique file ID for Appwrite storage
      const fileId = ID.unique();

      // Create video entry in database with proper arguments (database ID, collection ID, document ID, data object)
      const video = await databases.createDocument(
        DATABASE_ID,
        VIDEOS_COLLECTION_ID,
        ID.unique(),
        {
          name: fileName,
          fileSize,
          mimeType,
          fileId,
          status: 'initialized'
        },
        createDocumentPermissions() // Use the permission helper function
      );

      return {
        id: video.$id,
        name: video.name,
        fileSize: video.fileSize,
        mimeType: video.mimeType,
        fileId: video.fileId,
        status: video.status,
        createdAt: new Date(video.$createdAt), // Use Appwrite's built-in system field
        updatedAt: new Date(video.$updatedAt)  // Use Appwrite's built-in system field
      };
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error initializing upload:', error);
      throw new AppError(`Failed to initialize video upload: ${error.message || 'Unknown error'}`, 500);
    }
  }

  /**
   * Handle file upload buffer directly to Appwrite storage
   * @param videoId The video document ID
   * @param fileBuffer Buffer containing the file content
   * @param fileName Original file name (for Appwrite metadata)
   * @param fileSize File size (used for validation, not InputFile)
   * @param mimeType File MIME type (used for validation, not InputFile)
   */
  async handleFileUpload(
    videoId: string,
    fileBuffer: Buffer, // Accept Buffer instead of Readable stream
    fileName: string,
    _fileSize: number, // Unused but kept for API compatibility
    _mimeType: string  // Unused but kept for API compatibility
  ): Promise<Video> {
    let video: Video | null = null; // To store fetched video data
    try {
      // Get the video document to access the fileId and verify status
      video = await this.getVideoById(videoId, true); // Skip cache
      if (video.status !== 'initialized') {
          throw new AppError(`Video ${videoId} is not in initialized state (current: ${video.status}). Cannot upload.`, 409);
      }

      console.log(`Uploading file buffer directly to Appwrite for fileId: ${video.fileId}`);

      // Create InputFile directly from the buffer - Corrected: Removed fileSize and mimeType
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
      await redisService.deleteCachedVideo(videoId); // Invalidate specific video
      await redisService.deleteAllCachedVideos(); // Invalidate list cache

      // Return the updated video data
      return {
        id: updatedVideoDoc.$id,
        name: updatedVideoDoc.name,
        fileSize: updatedVideoDoc.fileSize,
        mimeType: updatedVideoDoc.mimeType,
        duration: updatedVideoDoc.duration, // Duration might be added later
        fileId: updatedVideoDoc.fileId,
        status: updatedVideoDoc.status,
        createdAt: new Date(updatedVideoDoc.$createdAt),
        updatedAt: new Date(updatedVideoDoc.$updatedAt)
      };

    } catch (error: any) {
        console.error('Error during direct file upload from buffer:', error); // Updated log message

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
                // Log inconsistency: Storage upload might have partially succeeded or failed, DB status not updated.
            }
        }

        // Re-throw specific Appwrite errors or a generic one
        if (error instanceof AppwriteException) {
             throw new AppError(`Appwrite error during upload: ${error.message}`, error.code || 500);
        } else if (error instanceof AppError) {
            throw error; // Re-throw existing AppErrors (like status conflict)
        } else {
            throw new AppError(`Failed to handle file upload from buffer: ${error.message || 'Unknown error'}`, 500); // Updated log message
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

      // Get the download URL for the file
      const downloadUrl = await storage.getFileDownload(VIDEOS_BUCKET_ID, fileId);

      // Fetch the file using node-fetch
      const response = await fetch(downloadUrl.toString());

      // Check if the response is OK
      if (!response.ok) {
        throw new Error(`Failed to fetch video: HTTP ${response.status} ${response.statusText}`);
      }

      // Ensure the response body is available as a stream
      if (!response.body) {
        throw new Error('Response body is null or undefined');
      }

      // Return the readable stream
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
      // Get file metadata from Appwrite
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

      // First get the video document to access the fileId
      const video = await this.getVideoById(videoId);

      if (!video || !video.fileId) {
        throw new AppError(`Invalid video or missing fileId for video ID: ${videoId}`, 500);
      }

      console.log(`Found video with fileId: ${video.fileId}`);

      // Directly construct the URL using the Appwrite endpoint and API
      // This is more reliable than using the SDK's getFileView/getFileDownload methods
      const appwriteEndpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
      const baseUrl = appwriteEndpoint.endsWith('/') ? appwriteEndpoint.slice(0, -1) : appwriteEndpoint;

      // Use the /view endpoint which doesn't trigger a download header
      // This is better for streaming and processing
      const directUrl = `${baseUrl}/storage/buckets/${VIDEOS_BUCKET_ID}/files/${video.fileId}/view`;

      console.log(`Constructed direct URL: ${directUrl}`);
      return directUrl;
    } catch (error: any) {
      console.error('Error getting video download URL:', error);
      throw new AppError(`Failed to get video download URL: ${error.message || 'Unknown error'}`, 500);
    }
  }

  /**
   * Delete video and its file from storage
   * @param id Video document ID
   */
  async deleteVideo(id: string): Promise<void> {
    try {
      const video = await this.getVideoById(id, true); // Skip cache for deletion

      // Delete the file from storage
      await storage.deleteFile(VIDEOS_BUCKET_ID, video.fileId);

      // Delete the document from database
      await databases.deleteDocument(
        DATABASE_ID,
        VIDEOS_COLLECTION_ID,
        id
      );

      // Invalidate caches
      await redisService.deleteCachedVideo(id); // Restore Redis call
      await redisService.deleteCachedSubtitle(id); // Restore Redis call
      await redisService.deleteAllCachedVideos(); // Restore Redis call for list invalidation

    } catch (error: any) {
      console.error('Error deleting video:', error);
      throw new AppError(`Failed to delete video: ${error.message || 'Unknown error'}`, 500);
    }
  }

  /**
   * Get video by ID
   * @param id Video ID
   * @param skipCache Whether to skip the cache and fetch directly from the database
   */
  async getVideoById(id: string, skipCache: boolean = false): Promise<Video> {
    try {
      // Check cache first if not skipping cache
      if (!skipCache) {
        const cachedVideo = await redisService.getCachedVideo(id); // Restore Redis call
        if (cachedVideo) {
          console.log(`Cache hit for video ID: ${id}`);
          return cachedVideo;
        }
        console.log(`Cache miss for video ID: ${id}`);
      }

      // Fetch from database if not in cache or skipCache is true
      const video = await databases.getDocument(
        DATABASE_ID,
        VIDEOS_COLLECTION_ID,
        id
      );

      const videoData = {
        id: video.$id,
        name: video.name,
        fileSize: video.fileSize,
        mimeType: video.mimeType,
        duration: video.duration,
        fileId: video.fileId,
        status: video.status,
        createdAt: new Date(video.$createdAt), // Use Appwrite's built-in system field
        updatedAt: new Date(video.$updatedAt)  // Use Appwrite's built-in system field
      };

      // Cache the video data for future requests
      await redisService.cacheVideo(videoData); // Restore Redis call

      return videoData;
    } catch (error: any) {
      console.error('Error fetching video:', error);
      throw new AppError(`Video not found: ${error.message || 'Unknown error'}`, 404);
    }
  }

  /**
   * List all videos
   * @param skipCache Whether to skip the cache and fetch directly from the database
   */
  async listVideos(skipCache: boolean = false): Promise<Video[]> {
    try {
      // Check cache first if not skipping cache
      if (!skipCache) {
        // Use redisService for cache operations
        const cachedData = await redisService.getCachedVideo('list');
        // Check if cachedData is not null/undefined AND has a videos property that is an array
        if (cachedData && 'videos' in cachedData && Array.isArray(cachedData.videos)) {
          console.log('Cache hit for video list');
          return cachedData.videos;
        }
        console.log('Cache miss for video list');
      }

      // Fetch from database if not in cache or skipCache is true
      const response = await databases.listDocuments(
        DATABASE_ID,
        VIDEOS_COLLECTION_ID
      );

      const videos = response.documents.map(doc => ({
        id: doc.$id,
        name: doc.name,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        duration: doc.duration,
        fileId: doc.fileId,
        status: doc.status,
        createdAt: new Date(doc.$createdAt), // Use Appwrite's built-in system field
        updatedAt: new Date(doc.$updatedAt)  // Use Appwrite's built-in system field
      }));

      // Cache the video list for future requests using redisService
      const videoListData = { id: 'list', videos } as unknown as Video;
      await redisService.cacheVideo(videoListData);

      return videos;
    } catch (error: any) {
      console.error('Error listing videos:', error);
      throw new AppError(`Failed to list videos: ${error.message || 'Unknown error'}`, 500);
    }
  }
}

// Export a singleton instance
export default new VideoService();