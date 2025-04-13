import { 
  setCacheValue, 
  getCacheValue, 
  deleteCacheValue, 
  deleteCachePattern,
  generateVideoKey,
  generateSubtitleKey
} from '../config/redis';
import { Video, Subtitle } from '../types';

/**
 * Redis Service for caching video and subtitle data
 */
export class RedisService {
  /**
   * Cache a video object
   * @param video Video object to cache
   * @param expirationInSeconds Optional expiration time in seconds
   */
  async cacheVideo(video: Video, expirationInSeconds?: number): Promise<void> {
    const key = generateVideoKey(video.id);
    await setCacheValue(key, video, expirationInSeconds);
  }

  /**
   * Get a cached video by ID
   * @param videoId Video ID
   * @returns Cached video or null if not found
   */
  async getCachedVideo(videoId: string): Promise<Video | null> {
    const key = generateVideoKey(videoId);
    return await getCacheValue<Video>(key);
  }

  /**
   * Cache subtitle data for a video
   * @param videoId Video ID
   * @param subtitleData Subtitle data to cache
   * @param expirationInSeconds Optional expiration time in seconds
   */
  async cacheSubtitle(videoId: string, subtitleData: any, expirationInSeconds?: number): Promise<void> {
    const key = generateSubtitleKey(videoId);
    await setCacheValue(key, subtitleData, expirationInSeconds);
  }

  /**
   * Get cached subtitle data for a video
   * @param videoId Video ID
   * @returns Cached subtitle data or null if not found
   */
  async getCachedSubtitle(videoId: string): Promise<any | null> {
    const key = generateSubtitleKey(videoId);
    return await getCacheValue(key);
  }

  /**
   * Delete a cached video
   * @param videoId Video ID
   */
  async deleteCachedVideo(videoId: string): Promise<void> {
    const key = generateVideoKey(videoId);
    await deleteCacheValue(key);
  }

  /**
   * Delete cached subtitle data for a video
   * @param videoId Video ID
   */
  async deleteCachedSubtitle(videoId: string): Promise<void> {
    const key = generateSubtitleKey(videoId);
    await deleteCacheValue(key);
  }

  /**
   * Delete all cached data for a video (both video and subtitles)
   * @param videoId Video ID
   */
  async deleteAllCachedVideoData(videoId: string): Promise<void> {
    await this.deleteCachedVideo(videoId);
    await this.deleteCachedSubtitle(videoId);
  }

  /**
   * Delete all cached videos
   */
  async deleteAllCachedVideos(): Promise<void> {
    await deleteCachePattern('video:*');
  }

  /**
   * Delete all cached subtitles
   */
  async deleteAllCachedSubtitles(): Promise<void> {
    await deleteCachePattern('subtitle:*');
  }
}

// Export a singleton instance
export default new RedisService();
