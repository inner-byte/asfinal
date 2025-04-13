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
// Import InputFile from the correct path
import { InputFile } from 'node-appwrite/file';
import fs from 'fs';
import { Video } from '../types';
import { AppError } from '../middleware/errorHandler';
import { Readable } from 'stream';
import path from 'path';

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
      // Use the uploads directory instead of os.tmpdir()
      const uploadsDir = path.join(__dirname, '../../src/uploads');

      // Ensure the uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const tempFilePath = path.join(uploadsDir, `upload_${video.fileId}`);
      console.log(`Writing file to: ${tempFilePath}`);

      const writeStream = fs.createWriteStream(tempFilePath);

      // Stream the file to disk first (buffer)
      await new Promise<void>((resolve, reject) => {
        fileStream.pipe(writeStream)
          .on('finish', () => {
            console.log(`File successfully written to ${tempFilePath}`);
            resolve();
          })
          .on('error', (err) => {
            console.error(`Error writing file to ${tempFilePath}:`, err);
            reject(new AppError(`Error writing file: ${err.message}`, 500));
          });
      });

      // Verify the file exists and has content
      if (!fs.existsSync(tempFilePath)) {
        throw new AppError(`Temporary file was not created at ${tempFilePath}`, 500);
      }

      const fileStats = fs.statSync(tempFilePath);
      console.log(`File size: ${fileStats.size} bytes`);

      if (fileStats.size === 0) {
        throw new AppError('Uploaded file is empty', 400);
      }

      // Upload the file from disk to Appwrite storage
      try {
        // Use InputFile.fromPath to create a File object from the file path
        const file = InputFile.fromPath(tempFilePath, fileName);
        console.log(`Uploading file to Appwrite bucket: ${VIDEOS_BUCKET_ID}, fileId: ${video.fileId}`);

        await storage.createFile(
          VIDEOS_BUCKET_ID,
          video.fileId,
          file,
          createFilePermissions()  // Use the permission helper function
        );

        console.log('File successfully uploaded to Appwrite storage');
      } catch (error: any) {
        console.error('Error uploading to Appwrite:', error);
        throw new AppError(`Failed to upload to Appwrite: ${error.message || 'Unknown error'}`, 500);
      }

      // Clean up the temp file
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`Temporary file ${tempFilePath} deleted`);
      } catch (error: any) {
        console.warn(`Warning: Could not delete temporary file: ${error.message || 'Unknown error'}`);
        // Continue execution even if cleanup fails
      }

      // Update the video document with any additional information if needed
      try {
        await databases.updateDocument(
          DATABASE_ID,
          VIDEOS_COLLECTION_ID,
          videoId,
          {
            // Update status to indicate the upload is complete
            status: 'uploaded'
          },
          createDocumentPermissions() // Use the permission helper function
        );
        console.log('Video document updated in database');
      } catch (error: any) {
        console.error('Error updating video document:', error);
        throw new AppError(`Failed to update video document: ${error.message || 'Unknown error'}`, 500);
      }

      // Return the updated video document
      return this.getVideoById(videoId);
    } catch (error: any) {
      console.error('Error handling file upload:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to upload video file: ${error.message || 'Unknown error'}`, 500);
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
    } catch (error: any) {
      console.error('Error streaming video:', error);
      throw new AppError(`Failed to stream video: ${error.message || 'Unknown error'}`, 500);
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
        DATABASE_ID,
        VIDEOS_COLLECTION_ID,
        id
      );
    } catch (error: any) {
      console.error('Error deleting video:', error);
      throw new AppError(`Failed to delete video: ${error.message || 'Unknown error'}`, 500);
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
        DATABASE_ID,
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
        status: video.status,
        createdAt: new Date(video.$createdAt), // Use Appwrite's built-in system field
        updatedAt: new Date(video.$updatedAt)  // Use Appwrite's built-in system field
      };
    } catch (error: any) {
      console.error('Error fetching video:', error);
      throw new AppError(`Video not found: ${error.message || 'Unknown error'}`, 404);
    }
  }

  /**
   * List all videos
   */
  async listVideos(): Promise<Video[]> {
    try {
      // Corrected listDocuments call with database ID and collection ID
      const response = await databases.listDocuments(
        DATABASE_ID,
        VIDEOS_COLLECTION_ID
      );

      return response.documents.map(doc => ({
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
    } catch (error: any) {
      console.error('Error listing videos:', error);
      throw new AppError(`Failed to list videos: ${error.message || 'Unknown error'}`, 500);
    }
  }
}