import {
  setCacheValue,
  getCacheValue,
  deleteCacheValue,
  deleteCachePattern,
  generateVideoKey,
  generateSubtitleKey,
  redisClient,
  DEFAULT_EXPIRATION_TIME
} from '../config/redis'; // Functions now directly use Redis
import { Video, Subtitle } from '../types';

/**
 * Service for interacting with the Redis cache.
 */
export class RedisService {

  /**
   * Cache video metadata in Redis.
   * @param video The video object to cache.
   * @param expirationInSeconds Optional expiration time.
   */
  async cacheVideo(video: Video, expirationInSeconds?: number): Promise<void> {
    const key = generateVideoKey(video.id);
    // Directly calls the simplified setCacheValue which uses Redis
    await setCacheValue(key, video, expirationInSeconds);
  }

  /**
   * Get cached video metadata from Redis.
   * @param videoId The ID of the video.
   * @returns The cached video object or null if not found or on error.
   */
  async getCachedVideo(videoId: string): Promise<Video | null> {
    const key = generateVideoKey(videoId);
    // Directly calls the simplified getCacheValue which uses Redis
    return await getCacheValue<Video>(key);
  }

  /**
   * Cache subtitle data in Redis.
   * @param videoId The ID of the associated video.
   * @param subtitleData The subtitle data to cache.
   * @param expirationInSeconds Optional expiration time.
   */
  async cacheSubtitle(videoId: string, subtitleData: any, expirationInSeconds?: number): Promise<void> {
    const key = generateSubtitleKey(videoId);
    // Directly calls the simplified setCacheValue which uses Redis
    await setCacheValue(key, subtitleData, expirationInSeconds);
  }

  /**
   * Get cached subtitle data from Redis.
   * @param videoId The ID of the associated video.
   * @returns The cached subtitle data or null if not found or on error.
   */
  async getCachedSubtitle(videoId: string): Promise<any | null> {
    const key = generateSubtitleKey(videoId);
    // Directly calls the simplified getCacheValue which uses Redis
    return await getCacheValue(key);
  }

  /**
   * Delete cached video metadata from Redis.
   * @param videoId The ID of the video.
   */
  async deleteCachedVideo(videoId: string): Promise<void> {
    const key = generateVideoKey(videoId);
    // Directly calls the simplified deleteCacheValue which uses Redis
    await deleteCacheValue(key);
  }

  /**
   * Delete cached subtitle data from Redis.
   * @param videoId The ID of the associated video.
   */
  async deleteCachedSubtitle(videoId: string): Promise<void> {
    const key = generateSubtitleKey(videoId);
    // Directly calls the simplified deleteCacheValue which uses Redis
    await deleteCacheValue(key);
  }

  /**
   * Delete all cached data related to a specific video from Redis.
   * @param videoId The ID of the video.
   */
  async deleteAllCachedVideoData(videoId: string): Promise<void> {
    await this.deleteCachedVideo(videoId);
    await this.deleteCachedSubtitle(videoId);
    // Add any other related keys if necessary
  }

  /**
   * Delete all cached video metadata entries from Redis.
   * Use with caution.
   */
  async deleteAllCachedVideos(): Promise<void> {
    // Directly calls the simplified deleteCachePattern which uses Redis
    await deleteCachePattern('video:*');
  }

  /**
   * Delete all cached subtitle data entries from Redis.
   * Use with caution.
   */
  async deleteAllCachedSubtitles(): Promise<void> {
    // Directly calls the simplified deleteCachePattern which uses Redis
    await deleteCachePattern('subtitle:*');
  }

  /**
   * Check if Redis is connected and ready
   * @returns True if Redis is connected and ready, false otherwise
   */
  async isConnected(): Promise<boolean> {
    try {
      return redisClient.status === 'ready';
    } catch (error) {
      console.error('Error checking Redis connection status:', error);
      return false;
    }
  }

  /**
   * Connect to Redis if not already connected
   * @returns True if connection was successful, false otherwise
   */
  async connect(): Promise<boolean> {
    try {
      if (redisClient.status !== 'ready') {
        await redisClient.connect();
        return redisClient.status === 'ready';
      }
      return true; // Already connected
    } catch (error) {
      console.error('Error connecting to Redis:', error);
      return false;
    }
  }

  /**
   * Store a file hash with associated video and subtitle information
   * @param fileHash The SHA-256 hash of the file content
   * @param videoData Object containing videoId and optional subtitleId
   * @param expirationSeconds Cache expiration time in seconds (default: 30 days)
   */
  async storeFileHash(
    fileHash: string,
    videoData: { videoId: string, subtitleId?: string },
    expirationSeconds: number = 60 * 60 * 24 * 30
  ): Promise<void> {
    const key = `file:hash:${fileHash}`;
    await setCacheValue(key, videoData, expirationSeconds);
  }

  /**
   * Get video information by file hash
   * @param fileHash The SHA-256 hash of the file content
   * @returns Object containing videoId and optional subtitleId, or null if not found
   */
  async getVideoByFileHash(fileHash: string): Promise<{ videoId: string, subtitleId?: string } | null> {
    const key = `file:hash:${fileHash}`;
    return getCacheValue<{ videoId: string, subtitleId?: string }>(key);
  }

  /**
   * Update subtitle information for an existing file hash
   * @param fileHash The SHA-256 hash of the file content
   * @param subtitleId The ID of the generated subtitle
   * @returns True if the update was successful, false otherwise
   */
  async updateFileHashWithSubtitle(fileHash: string, subtitleId: string): Promise<boolean> {
    const key = `file:hash:${fileHash}`;
    const existingData = await getCacheValue<{ videoId: string, subtitleId?: string }>(key);

    if (!existingData) {
      return false;
    }

    await setCacheValue(key, { ...existingData, subtitleId }, 60 * 60 * 24 * 30);
    return true;
  }

  /**
   * Delete a file hash from Redis
   * @param fileHash The SHA-256 hash of the file content
   * @returns True if the deletion was successful, false otherwise
   */
  async deleteFileHash(fileHash: string): Promise<boolean> {
    try {
      const key = `file:hash:${fileHash}`;
      await deleteCacheValue(key);
      return true;
    } catch (error) {
      console.error(`Error deleting file hash ${fileHash}:`, error);
      return false;
    }
  }
}

// Export a singleton instance
export default new RedisService();
