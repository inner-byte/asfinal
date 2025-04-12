import { ID } from 'node-appwrite';
import { storage, databases, VIDEOS_BUCKET_ID, VIDEOS_COLLECTION_ID } from '../config/appwrite';
import { InputFile } from 'node-appwrite/dist/inputFile';
import fs from 'fs';
import { Video } from '../types';
import { AppError } from '../middleware/errorHandler';
import { Readable } from 'stream';
import path from 'path';
import os from 'os';

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

      // Generate upload URL or token (in a real implementation, this would be used for direct uploads)

      // Create video entry in database with proper arguments (database ID, collection ID, document ID, data object)
      const video = await databases.createDocument(
        process.env.APPWRITE_DATABASE_ID || '',
        VIDEOS_COLLECTION_ID,
        ID.unique(),
        {
          name: fileName,
          fileSize,
          mimeType,
          fileId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      return {
        id: video.$id,
        name: video.name,
        fileSize: video.fileSize,
        mimeType: video.mimeType,
        fileId: video.fileId,
        createdAt: new Date(video.createdAt),
        updatedAt: new Date(video.updatedAt)
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error initializing upload:', error);
      throw new AppError('Failed to initialize video upload', 500);
    }
  }

  /**
   * Handle file upload stream to Appwrite storage
   * @param videoId The video document ID
   * @param fileStream Readable stream of the file
   * @param fileName Original file name
   */
  async handleFileUpload(
    videoId: string,
    fileStream: Readable,
    fileName: string
  ): Promise<Video> {
    try {
      // First get the video document to access the fileId
      const video = await this.getVideoById(videoId);

      // Create a temp file path for buffering the stream
      const tempFilePath = path.join(os.tmpdir(), `upload_${video.fileId}`);
      const writeStream = fs.createWriteStream(tempFilePath);

      // Stream the file to disk first (buffer)
      await new Promise<void>((resolve, reject) => {
        fileStream.pipe(writeStream)
          .on('finish', () => resolve())
          .on('error', (err) => reject(new AppError(`Error writing file: ${err.message}`, 500)));
      });

      // Upload the file from disk to Appwrite storage
      // Use InputFile.fromPath to create a File object from the file path
      const file = InputFile.fromPath(tempFilePath, fileName);
      await storage.createFile(
        VIDEOS_BUCKET_ID,
        video.fileId,
        file,
        undefined  // No specific permissions
      );

      // Clean up the temp file
      fs.unlinkSync(tempFilePath);

      // Update the video document with any additional information if needed
      await databases.updateDocument(
        process.env.APPWRITE_DATABASE_ID || '',
        VIDEOS_COLLECTION_ID,
        videoId,
        { updatedAt: new Date().toISOString() }
      );

      // Return the updated video document
      return this.getVideoById(videoId);
    } catch (error) {
      console.error('Error handling file upload:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to upload video file', 500);
    }
  }

  /**
   * Stream video file from storage
   * @param fileId The file ID in storage
   */
  async streamVideo(fileId: string): Promise<Buffer> {
    try {
      // Get file view (download URL or file content)
      const fileView = await storage.getFileView(VIDEOS_BUCKET_ID, fileId);
      return Buffer.from(fileView);
    } catch (error) {
      console.error('Error streaming video:', error);
      throw new AppError('Failed to stream video', 500);
    }
  }

  /**
   * Delete video and its file from storage
   * @param id Video document ID
   */
  async deleteVideo(id: string): Promise<void> {
    try {
      const video = await this.getVideoById(id);

      // Delete the file from storage
      await storage.deleteFile(VIDEOS_BUCKET_ID, video.fileId);

      // Delete the document from database
      await databases.deleteDocument(
        process.env.APPWRITE_DATABASE_ID || '',
        VIDEOS_COLLECTION_ID,
        id
      );
    } catch (error) {
      console.error('Error deleting video:', error);
      throw new AppError('Failed to delete video', 500);
    }
  }

  /**
   * Get video by ID
   * @param id Video ID
   */
  async getVideoById(id: string): Promise<Video> {
    try {
      // Corrected getDocument call with database ID and collection ID
      const video = await databases.getDocument(
        process.env.APPWRITE_DATABASE_ID || '',
        VIDEOS_COLLECTION_ID,
        id
      );

      return {
        id: video.$id,
        name: video.name,
        fileSize: video.fileSize,
        mimeType: video.mimeType,
        duration: video.duration,
        fileId: video.fileId,
        createdAt: new Date(video.createdAt),
        updatedAt: new Date(video.updatedAt)
      };
    } catch (error) {
      console.error('Error fetching video:', error);
      throw new AppError('Video not found', 404);
    }
  }

  /**
   * List all videos
   */
  async listVideos(): Promise<Video[]> {
    try {
      // Corrected listDocuments call with database ID and collection ID
      const response = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID || '',
        VIDEOS_COLLECTION_ID
      );

      return response.documents.map(doc => ({
        id: doc.$id,
        name: doc.name,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        duration: doc.duration,
        fileId: doc.fileId,
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt)
      }));
    } catch (error) {
      console.error('Error listing videos:', error);
      throw new AppError('Failed to list videos', 500);
    }
  }
}