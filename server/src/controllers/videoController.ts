import { Request, Response, NextFunction } from 'express';
import { ApiResponse, Video } from '../types';
import { AppError } from '../middleware/errorHandler';
import videoService from '../services/videoService'; // Import the singleton instance

/**
 * Controller for handling video-related API requests
 */
export class VideoController {
  /**
   * Initialize a video upload
   */
  initializeUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileName, fileSize, mimeType } = req.body;

      // Validate request body
      if (!fileName || !fileSize || !mimeType) {
        throw new AppError('Missing required fields: fileName, fileSize, or mimeType', 400);
      }

      // Use the singleton instance
      const video = await videoService.initializeUpload(fileName, fileSize, mimeType);

      const response: ApiResponse<Video> = {
        status: 'success',
        data: video,
        message: 'Upload initialized successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Upload video file buffer to Appwrite storage
   */
  uploadVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('Video ID is required', 400);
      }

      if (!req.file) {
        throw new AppError('No file data received. Ensure the file was uploaded correctly.', 400);
      }
      // Destructure buffer instead of stream
      const { originalname: fileName, size: fileSize, mimetype: mimeType, buffer } = req.file;

      // Check if buffer exists and has content
      if (!buffer || buffer.length === 0) {
        throw new AppError('File buffer is empty or missing in the request.', 500);
      }

      // Validate fileSize against buffer length for consistency
      if (fileSize !== buffer.length) {
         console.warn(`Reported file size (${fileSize}) differs from buffer length (${buffer.length}). Using buffer length.`);
      }

      // Process the file upload using the buffer
      const video = await videoService.handleFileUpload(
        id,
        buffer, // Pass the buffer
        fileName,
        buffer.length, // Use actual buffer length for InputFile
        mimeType
      );

      const response: ApiResponse<Video> = {
        status: 'success',
        data: video,
        message: 'Video uploaded successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Stream video file
   */
  streamVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('Video ID is required', 400);
      }

      // Get the video metadata to find the fileId
      const video = await videoService.getVideoById(id);

      // Stream the video file
      const videoBuffer = await videoService.streamVideo(video.fileId);

      // Set appropriate headers
      res.setHeader('Content-Type', video.mimeType);
      res.setHeader('Content-Length', videoBuffer.length);

      // Send the video file
      res.status(200).send(videoBuffer);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a video
   */
  deleteVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('Video ID is required', 400);
      }

      await videoService.deleteVideo(id);

      const response: ApiResponse<null> = {
        status: 'success',
        message: 'Video deleted successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a video by ID
   */
  getVideoById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('Video ID is required', 400);
      }

      const video = await videoService.getVideoById(id);

      const response: ApiResponse<Video> = {
        status: 'success',
        data: video
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * List all videos
   */
  listVideos = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const videos = await videoService.listVideos();

      const response: ApiResponse<Video[]> = {
        status: 'success',
        data: videos,
        message: `Found ${videos.length} videos`
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}