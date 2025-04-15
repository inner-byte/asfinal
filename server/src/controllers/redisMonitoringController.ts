import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import redisMonitoringService, { RedisMemoryInfo, RedisKeyStats, FileHashStats } from '../services/redisMonitoringService';
import { redisClient } from '../config/redis';
import { AppError } from '../middleware/errorHandler';

/**
 * Controller for Redis monitoring endpoints
 */
export class RedisMonitoringController {
  /**
   * Get Redis status and memory usage information
   */
  getRedisStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if Redis is connected
      const isConnected = redisClient.status === 'ready';

      // Get memory info if Redis is connected
      const memoryInfo = isConnected ? await redisMonitoringService.getMemoryInfo() : null;

      const response: ApiResponse<{
        status: string;
        uptime?: number;
        memoryInfo?: RedisMemoryInfo;
      }> = {
        status: 'success',
        data: {
          status: isConnected ? 'connected' : 'disconnected',
          uptime: isConnected ? await redisClient.info('server').then(info => {
            const match = info.match(/uptime_in_seconds:(\d+)/);
            return match ? parseInt(match[1], 10) : undefined;
          }) : undefined,
          memoryInfo: memoryInfo || undefined
        },
        message: isConnected ? 'Redis is connected' : 'Redis is disconnected'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get Redis key statistics
   */
  getKeyStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if Redis is connected
      if (redisClient.status !== 'ready') {
        throw new AppError('Redis is not connected', 503);
      }

      // Get key statistics
      const keyStats = await redisMonitoringService.getKeyStats();

      const response: ApiResponse<RedisKeyStats> = {
        status: 'success',
        data: keyStats || undefined,
        message: 'Redis key statistics retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get file hash statistics
   */
  getFileHashStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if Redis is connected
      if (redisClient.status !== 'ready') {
        throw new AppError('Redis is not connected', 503);
      }

      // Get file hash statistics
      const fileHashStats = await redisMonitoringService.getFileHashStats();

      const response: ApiResponse<FileHashStats> = {
        status: 'success',
        data: fileHashStats || undefined,
        message: 'File hash statistics retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Clean up expired and stale file hashes
   */
  cleanupFileHashes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if Redis is connected
      if (redisClient.status !== 'ready') {
        throw new AppError('Redis is not connected', 503);
      }

      // Get the checkAppwrite parameter from the request body
      const { checkAppwrite = true } = req.body;

      // Clean up expired and stale file hashes
      const removedCount = await redisMonitoringService.cleanupExpiredFileHashes(checkAppwrite);

      const response: ApiResponse<{ removedCount: number, checkedAppwrite: boolean }> = {
        status: 'success',
        data: {
          removedCount,
          checkedAppwrite: !!checkAppwrite
        },
        message: `Successfully removed ${removedCount} expired or stale file hash${removedCount === 1 ? '' : 'es'}`
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}

// Export a singleton instance
export default new RedisMonitoringController();
