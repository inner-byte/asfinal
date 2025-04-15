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
      // Extract language from body as well
      const { fileName, fileSize, mimeType, language } = req.body;

      // Validate request body
      if (!fileName || !fileSize || !mimeType) {
        // Keep language optional for now, service provides default
        throw new AppError('Missing required fields: fileName, fileSize, or mimeType', 400);
      }

      // Use the singleton instance, passing language
      const video = await videoService.initializeUpload(fileName, fileSize, mimeType, language);

      const response: ApiResponse<Video> = {
        status: 'success',
        data: video,
        message: 'Upload initialized successfully'
      };

      // --- BEGIN ADDED LOGGING ---
      console.log('Sending response for initializeUpload:', JSON.stringify(response, null, 2));
      if (!response.data || !response.data.id) {
          console.error("CRITICAL: Controller is about to send response missing data.id!", response);
      }
      // --- END ADDED LOGGING ---

      res.status(201).json(response);
    } catch (error) {
      // --- BEGIN ADDED LOGGING ---
      console.error("Error caught in initializeUpload controller:", error);
      // --- END ADDED LOGGING ---
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
      const range = req.headers.range;

      if (!id) {
        throw new AppError('Video ID is required', 400);
      }

      // Get the video metadata to find the fileId
      const video = await videoService.getVideoById(id);

      // Get video file metadata for proper headers
      const fileMetadata = await videoService.getVideoFileMetadata(video.fileId);

      // Set content type header
      res.setHeader('Content-Type', fileMetadata.mimeType);

      // Set cache control headers to improve performance
      res.setHeader('Cache-Control', 'public, max-age=3600');

      // Handle range requests (for seeking in video)
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileMetadata.size - 1;
        const chunkSize = (end - start) + 1;

        // Set partial content headers
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileMetadata.size}`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', chunkSize);

        console.log(`Streaming video ${id} with range: bytes ${start}-${end}/${fileMetadata.size}`);
      } else {
        // Set content length for full file
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', fileMetadata.size);
        console.log(`Streaming full video ${id}, size: ${fileMetadata.size} bytes`);
      }

      // Get the video stream
      const videoStream = await videoService.getVideoStream(video.fileId);

      // Pipe the stream directly to the response
      videoStream.pipe(res);

      // Handle errors in the stream
      videoStream.on('error', (error) => {
        console.error(`Error streaming video ${id}:`, error);
        // Only send error if headers haven't been sent yet
        if (!res.headersSent) {
          next(new AppError(`Video streaming error: ${error.message}`, 500));
        }
      });

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