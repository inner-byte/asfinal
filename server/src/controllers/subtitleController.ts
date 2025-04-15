import { Request, Response, NextFunction } from 'express';
import { ApiResponse, Subtitle, SubtitleGenerationStatus } from '../types';
import { AppError } from '../middleware/errorHandler';
import subtitleService from '../services/subtitleService'; // Import the singleton instance
import backgroundJobService from '../services/backgroundJobService'; // Import the background job service
import redisService from '../services/redisService'; // Import Redis service
import { redisClient } from '../config/redis'; // Import Redis client

// Note: Express body-parser limit is set in index.ts

/**
 * Controller for handling subtitle-related API requests
 */
export class SubtitleController {
  /**
   * Generate subtitles for a video
   */
  generateSubtitles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { videoId } = req.params;
      const { language = 'en', useBackgroundJob = true } = req.body;

      if (!videoId) {
        throw new AppError('Video ID is required', 400);
      }

      // Validate language code format
      if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(language)) {
        throw new AppError('Invalid language code format. Use ISO 639-1 format (e.g., "en", "fr", "zh-CN")', 400);
      }

      console.log(`[SubtitleController] Initiating subtitle generation for video ${videoId} in language ${language}`);

      // Check if we should use background processing or synchronous processing
      if (useBackgroundJob) {
        // Create a pending subtitle document
        const documentId = await subtitleService.createPendingSubtitleDocument(videoId, language);

        // Add the job to the queue
        const jobId = await backgroundJobService.addSubtitleGenerationJob(videoId, language, documentId);

        // Return a 202 Accepted response with the job ID and document ID
        const response: ApiResponse<{ jobId: string, subtitleId: string }> = {
          status: 'success',
          data: { jobId, subtitleId: documentId },
          message: 'Subtitle generation job queued successfully. Check job status for updates.'
        };

        res.status(202).json(response);
      } else {
        // Use the subtitle service to generate subtitles synchronously (legacy mode)
        const subtitle = await subtitleService.generateSubtitles(videoId, language);

        // Try to update the file hash record with the subtitle ID
        try {
          // Instead of downloading the entire file again, use a simpler approach
          // Just try to find the hash directly from Redis

          if (redisClient.status !== 'ready') {
            console.warn('Redis not ready, skipping file hash update');
          } else {
            // Get all file hashes that point to this video ID
            let cursor = '0';
            let fileHash = null;

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
                    console.warn(`Error parsing JSON for key ${key}:`, e);
                  }
                }
              }

              // If we found a hash, break out of the loop
              if (fileHash) {
                break;
              }
            } while (cursor !== '0');

            if (fileHash) {
              // Update the hash record with the subtitle ID
              await redisService.updateFileHashWithSubtitle(fileHash, subtitle.id);
              console.log(`Updated file hash ${fileHash} with subtitle ID ${subtitle.id}`);
            } else {
              console.warn(`Could not find file hash for video ID ${videoId}, skipping update`);
            }
          }
        } catch (error) {
          // Log but don't fail if updating the hash record fails
          console.warn(`Failed to update file hash record with subtitle ID: ${error}`);
        }

        // Construct detailed response
        const response: ApiResponse<Subtitle> = {
          status: 'success',
          data: subtitle,
          message: 'Subtitle generation completed successfully'
        };

        res.status(201).json(response);
      }
    } catch (error: any) {
      // Handle specific error cases
      if (error instanceof AppError) {
        if (error.statusCode === 413) {
          console.error(`[SubtitleController] Video file too large: ${error.message}`);
        } else if (error.statusCode === 404) {
          console.error(`[SubtitleController] Video not found: ${error.message}`);
        }
      }

      next(error);
    }
  };

  /**
   * Get subtitles for a specific video
   */
  getSubtitlesByVideoId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { videoId } = req.params;

      if (!videoId) {
        throw new AppError('Video ID is required', 400);
      }

      // Get all subtitles for the video
      const subtitles = await subtitleService.getSubtitlesByVideoId(videoId);

      const response: ApiResponse<Subtitle[]> = {
        status: 'success',
        data: subtitles,
        message: subtitles.length > 0
          ? `Found ${subtitles.length} subtitle${subtitles.length === 1 ? '' : 's'}`
          : 'No subtitles found for this video'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get subtitle by ID
   */
  getSubtitleById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('Subtitle ID is required', 400);
      }

      // Get the subtitle
      const subtitle = await subtitleService.getSubtitleById(id);

      const response: ApiResponse<Subtitle> = {
        status: 'success',
        data: subtitle,
        message: 'Subtitle retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      // If it's a 404 error, provide a more user-friendly message
      if (error instanceof AppError && error.statusCode === 404) {
        return next(new AppError('Subtitle not found with the provided ID', 404));
      }
      next(error);
    }
  };

  /**
   * Get subtitle content
   */
  getSubtitleContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileId } = req.params;
      // Note: format parameter reserved for future conversion support
      // const { format } = req.query;

      if (!fileId) {
        throw new AppError('File ID is required', 400);
      }

      // Get the content
      const content = await subtitleService.getSubtitleContent(fileId);

      // Set appropriate headers for VTT content
      res.setHeader('Content-Type', 'text/vtt');

      // Check if the client wants to download the file or just view it
      const disposition = req.query.download === 'true'
        ? 'attachment'
        : 'inline';

      res.setHeader('Content-Disposition', `${disposition}; filename="subtitle_${fileId}.vtt"`);

      // Send the content directly as text
      res.status(200).send(content);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return next(new AppError('Subtitle file not found', 404));
      }
      next(error);
    }
  };

  /**
   * Delete a subtitle
   */
  deleteSubtitle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('Subtitle ID is required', 400);
      }

      // Delete the subtitle
      await subtitleService.deleteSubtitle(id);

      const response: ApiResponse<null> = {
        status: 'success',
        message: 'Subtitle deleted successfully'
      };

      res.status(200).json(response);
    } catch (error: any) {
      // If the subtitle wasn't found, return a more specific message
      if (error.statusCode === 404) {
        return next(new AppError('Cannot delete: subtitle not found', 404));
      }
      next(error);
    }
  };

  /**
   * Get the status of a subtitle generation job
   */
  getJobStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        throw new AppError('Job ID is required', 400);
      }

      // Get the job status from the background job service
      const jobStatus = await backgroundJobService.getJobStatus(jobId);

      // Construct response
      const response: ApiResponse<typeof jobStatus> = {
        status: 'success',
        data: jobStatus,
        message: `Job status retrieved successfully: ${jobStatus.status}`
      };

      res.status(200).json(response);
    } catch (error: any) {
      if (error instanceof AppError && error.statusCode === 404) {
        return next(new AppError('Job not found with the provided ID', 404));
      }
      next(error);
    }
  };
}


// Export singleton instance and individual methods for direct imports
const subtitleController = new SubtitleController();

export const {
  generateSubtitles,
  getSubtitlesByVideoId,
  getSubtitleById,
  getSubtitleContent,
  deleteSubtitle,
  getJobStatus
} = subtitleController;

export default subtitleController;