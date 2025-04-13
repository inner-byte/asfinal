import { Request, Response, NextFunction } from 'express';
import { VideoService } from '../services/videoService';
import { ApiResponse, Video } from '../types';
import { AppError } from '../middleware/errorHandler';
import * as fs from 'fs';

/**
 * Controller for handling video-related API requests
 */
export class VideoController {
  private videoService: VideoService;

  constructor() {
    this.videoService = new VideoService();
  }

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

      const video = await this.videoService.initializeUpload(fileName, fileSize, mimeType);

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
   * Upload video file to Appwrite storage
   */
  uploadVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('Video ID is required', 400);
      }

      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }

      // Create a readable stream from the uploaded file
      const fileStream = fs.createReadStream(req.file.path);

      // Process the file upload
      const video = await this.videoService.handleFileUpload(
        id,
        fileStream,
        req.file.originalname
      );

      // Clean up the temporary file after upload
      fs.unlinkSync(req.file.path);

      const response: ApiResponse<Video> = {
        status: 'success',
        data: video,
        message: 'Video uploaded successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      // Clean up temporary file if it exists
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
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
      const video = await this.videoService.getVideoById(id);

      // Stream the video file
      const videoBuffer = await this.videoService.streamVideo(video.fileId);

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

      await this.videoService.deleteVideo(id);

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

      const video = await this.videoService.getVideoById(id);

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
      const videos = await this.videoService.listVideos();

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