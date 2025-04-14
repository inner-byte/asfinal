import {
  setCacheValue,
  getCacheValue,
  deleteCacheValue,
  deleteCachePattern,
  generateVideoKey,
  generateSubtitleKey
} from '../config/redis'; // Functions now directly use Redis
import { Video } from '../types';

/**
 * Service for interacting with the Redis cache.
 */
export class RedisService {
  [x: string]: any;
  [x: string]: any;
  getCacheValue<T>(cacheKey: string) {
    throw new Error('Method not implemented.');
  }
  setCacheValue(cacheKey: string, arg1: { videos: { id: string; name: any; fileSize: any; mimeType: any; duration: any; fileId: any; status: any; createdAt: Date; updatedAt: Date; }[]; }) {
    throw new Error('Method not implemented.');
  }

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
}

// Export a singleton instance
export default new RedisService();
