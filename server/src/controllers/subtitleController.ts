import { Request, Response, NextFunction } from 'express';
import { SubtitleService } from '../services/subtitleService';
import { ApiResponse, SubtitleFormat, SubtitleGenerationTask, Subtitle } from '../types';
import { AppError } from '../middleware/errorHandler';

/**
 * Controller for handling subtitle-related API requests
 */
export class SubtitleController {
  private subtitleService: SubtitleService;

  constructor() {
    this.subtitleService = new SubtitleService();
  }

  /**
   * Generate subtitles for a video
   */
  generateSubtitles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { videoId } = req.params;
      const { language = 'en' } = req.body;

      if (!videoId) {
        throw new AppError('Video ID is required', 400);
      }

      const task = await this.subtitleService.generateSubtitles(videoId, language);

      const response: ApiResponse<SubtitleGenerationTask> = {
        status: 'success',
        data: task,
        message: 'Subtitle generation task created successfully'
      };

      res.status(202).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get subtitle generation task status
   */
  getGenerationStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        throw new AppError('Task ID is required', 400);
      }

      const task = await this.subtitleService.getSubtitleGenerationStatus(taskId);

      const response: ApiResponse<SubtitleGenerationTask> = {
        status: 'success',
        data: task,
        message: `Subtitle generation task status: ${task.status}`
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get subtitles for a video
   */
  getSubtitles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { videoId } = req.params;
      const { format = SubtitleFormat.VTT } = req.query;

      if (!videoId) {
        throw new AppError('Video ID is required', 400);
      }

      // Validate format
      if (!Object.values(SubtitleFormat).includes(format as SubtitleFormat)) {
        throw new AppError(`Invalid subtitle format: ${format}. Supported formats: ${Object.values(SubtitleFormat).join(', ')}`, 400);
      }

      const subtitles = await this.subtitleService.getSubtitles(videoId, format as SubtitleFormat);

      if (!subtitles) {
        throw new AppError(`No subtitles found for video ID: ${videoId} in format: ${format}`, 404);
      }

      const response: ApiResponse<Subtitle> = {
        status: 'success',
        data: subtitles,
        message: 'Subtitles retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Save subtitles for a video
   */
  saveSubtitles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { videoId } = req.params;
      const { content, format = SubtitleFormat.VTT, language = 'en' } = req.body;

      if (!videoId) {
        throw new AppError('Video ID is required', 400);
      }

      if (!content) {
        throw new AppError('Subtitle content is required', 400);
      }

      // Validate format
      if (!Object.values(SubtitleFormat).includes(format as SubtitleFormat)) {
        throw new AppError(`Invalid subtitle format: ${format}. Supported formats: ${Object.values(SubtitleFormat).join(', ')}`, 400);
      }

      const subtitle = await this.subtitleService.saveSubtitles(
        videoId,
        content,
        format as SubtitleFormat,
        language
      );

      const response: ApiResponse<Subtitle> = {
        status: 'success',
        data: subtitle,
        message: 'Subtitles saved successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete subtitles
   */
  deleteSubtitles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('Subtitle ID is required', 400);
      }

      await this.subtitleService.deleteSubtitles(id);

      const response: ApiResponse<null> = {
        status: 'success',
        message: 'Subtitles deleted successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
