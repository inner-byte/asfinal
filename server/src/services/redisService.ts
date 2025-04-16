import { redisClient, DEFAULT_EXPIRATION_TIME } from '../config/redis';
import { Video } from '../types'; // Assuming Subtitle type might not be needed directly here if storing 'any'

// --- Custom Error Classes ---
export class CacheUnavailableError extends Error {
  constructor(message: string = 'Redis cache is not available') {
    super(message);
    this.name = 'CacheUnavailableError';
  }
}

export class CacheOperationError extends Error {
  public originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'CacheOperationError';
    this.originalError = originalError;
  }
}
// --- End Custom Error Classes ---

/**
 * Service for interacting with the Redis cache.
 * Provides methods for caching video metadata, subtitles, and file hashes
 * with improved error handling and structure.
 */
export class RedisService {

  // --- Private Helper Methods ---

  private checkConnection(): void {
    if (redisClient.status !== 'ready') {
      console.warn(`Redis not ready, operation cannot proceed.`);
      throw new CacheUnavailableError();
    }
  }

  private generateVideoKey(videoId: string): string {
    return `video:${videoId}`;
  }

  private generateSubtitleKey(videoId: string): string {
    return `subtitle:${videoId}`;
  }

  private generateFileHashKey(fileHash: string): string {
    return `file:hash:${fileHash}`;
  }

  private async _setCacheValue(
    key: string,
    value: any,
    expirationInSeconds: number = DEFAULT_EXPIRATION_TIME
  ): Promise<void> {
    this.checkConnection();
    try {
      await redisClient.set(key, JSON.stringify(value), 'EX', expirationInSeconds);
    } catch (error: any) {
      const message = `Redis Error: Failed setting cache value for key ${key}`;
      console.error(message, error);
      throw new CacheOperationError(message, error);
    }
  }

  private async _getCacheValue<T>(key: string): Promise<T | null> {
    this.checkConnection();
    try {
      const redisValue = await redisClient.get(key);
      if (redisValue) {
        return JSON.parse(redisValue) as T;
      }
      return null; // Cache miss
    } catch (error: any) {
      // Distinguish between parse error and connection error? For now, treat as operation error.
      const message = `Redis Error: Failed getting cache value for key ${key}`;
      console.error(message, error);
      // Return null on error to maintain previous behavior for simple gets,
      // but allow specific handling if needed elsewhere.
      // Consider throwing CacheOperationError here if callers should handle failures explicitly.
      return null;
      // throw new CacheOperationError(message, error); // Alternative: Force explicit handling
    }
  }

  private async _deleteCacheValue(key: string): Promise<void> {
    this.checkConnection();
    try {
      await redisClient.del(key);
    } catch (error: any) {
      const message = `Redis Error: Failed deleting cache value for key ${key}`;
      console.error(message, error);
      throw new CacheOperationError(message, error);
    }
  }

  private async _deleteCachePattern(pattern: string): Promise<void> {
    this.checkConnection();
    try {
      let cursor = '0';
      do {
        // Note: Using 'any' for reply type as ioredis types might be complex here
        const reply: any = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
        cursor = reply[0];
        const keys = reply[1];
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      } while (cursor !== '0');
      console.log(`Redis: Deleted keys matching pattern ${pattern}`);
    } catch (error: any) {
      const message = `Redis Error: Failed deleting cache values for pattern ${pattern}`;
      console.error(message, error);
      throw new CacheOperationError(message, error);
    }
  }

  // --- Public API Methods ---

  /**
   * Cache video metadata in Redis.
   * @param video The video object to cache.
   * @param expirationInSeconds Optional expiration time.
   * @throws {CacheUnavailableError | CacheOperationError}
   */
  async cacheVideo(video: Video, expirationInSeconds?: number): Promise<void> {
    const key = this.generateVideoKey(video.id);
    await this._setCacheValue(key, video, expirationInSeconds);
  }

  /**
   * Get cached video metadata from Redis.
   * @param videoId The ID of the video.
   * @returns The cached video object or null if not found or on non-critical error.
   * @throws {CacheUnavailableError} If Redis connection is not ready.
   */
  async getCachedVideo(videoId: string): Promise<Video | null> {
    const key = this.generateVideoKey(videoId);
    // Returns null on operational error for now, matching previous behavior
    return await this._getCacheValue<Video>(key);
  }

  /**
   * Cache subtitle data in Redis.
   * @param videoId The ID of the associated video.
   * @param subtitleData The subtitle data to cache (can be string, object, etc.).
   * @param expirationInSeconds Optional expiration time.
   * @throws {CacheUnavailableError | CacheOperationError}
   */
  async cacheSubtitle(videoId: string, subtitleData: any, expirationInSeconds?: number): Promise<void> {
    const key = this.generateSubtitleKey(videoId);
    await this._setCacheValue(key, subtitleData, expirationInSeconds);
  }

  /**
   * Get cached subtitle data from Redis.
   * @param videoId The ID of the associated video.
   * @returns The cached subtitle data or null if not found or on non-critical error.
   * @throws {CacheUnavailableError} If Redis connection is not ready.
   */
  async getCachedSubtitle(videoId: string): Promise<any | null> {
    const key = this.generateSubtitleKey(videoId);
    // Returns null on operational error for now
    return await this._getCacheValue<any>(key);
  }

  /**
   * Delete cached video metadata from Redis.
   * @param videoId The ID of the video.
   * @throws {CacheUnavailableError | CacheOperationError}
   */
  async deleteCachedVideo(videoId: string): Promise<void> {
    const key = this.generateVideoKey(videoId);
    await this._deleteCacheValue(key);
  }

  /**
   * Delete cached subtitle data from Redis.
   * @param videoId The ID of the associated video.
   * @throws {CacheUnavailableError | CacheOperationError}
   */
  async deleteCachedSubtitle(videoId: string): Promise<void> {
    const key = this.generateSubtitleKey(videoId);
    await this._deleteCacheValue(key);
  }

  /**
   * Delete all cached data related to a specific video from Redis.
   * @param videoId The ID of the video.
   * @throws {CacheUnavailableError | CacheOperationError}
   */
  async deleteAllCachedVideoData(videoId: string): Promise<void> {
    // Errors will propagate from the individual delete calls
    await this.deleteCachedVideo(videoId);
    await this.deleteCachedSubtitle(videoId);
    // Add any other related keys if necessary (e.g., file hash if linked)
    // Consider deleting the file hash key if the video is fully deleted
  }

  /**
   * Delete all cached video metadata entries from Redis using a pattern.
   * Use with caution as SCAN can impact performance on large datasets.
   * @throws {CacheUnavailableError | CacheOperationError}
   */
  async deleteAllCachedVideos(): Promise<void> {
    await this._deleteCachePattern('video:*');
  }

  /**
   * Delete all cached subtitle data entries from Redis using a pattern.
   * Use with caution.
   * @throws {CacheUnavailableError | CacheOperationError}
   */
  async deleteAllCachedSubtitles(): Promise<void> {
    await this._deleteCachePattern('subtitle:*');
  }

  /**
   * Check if Redis is connected and ready.
   * @returns True if Redis is connected and ready, false otherwise.
   */
  isConnected(): boolean {
    // No need for async here, status is synchronous property
    try {
      return redisClient.status === 'ready';
    } catch (error) {
      // This catch might be unnecessary if status access doesn't throw
      console.error('Error checking Redis connection status:', error);
      return false;
    }
  }

  // Removed redundant connect() method as ioredis handles auto-reconnect

  /**
   * Store a file hash with associated video information.
   * Used for aggressive duplicate detection.
   * @param fileHash The SHA-256 hash of the file content.
   * @param videoData Object containing videoId.
   * @param expirationSeconds Cache expiration time in seconds (default: 30 days).
   * @throws {CacheUnavailableError | CacheOperationError}
   */
  async storeFileHash(
    fileHash: string,
    videoData: { videoId: string }, // Initially store only videoId
    expirationSeconds: number = 60 * 60 * 24 * 30 // 30 days
  ): Promise<void> {
    const key = this.generateFileHashKey(fileHash);
    // Store only essential info initially
    await this._setCacheValue(key, videoData, expirationSeconds);
  }

  /**
   * Get video information by file hash. Used for duplicate detection.
   * @param fileHash The SHA-256 hash of the file content.
   * @returns Object containing videoId and optional subtitleId, or null if not found.
   * @throws {CacheUnavailableError} If Redis connection is not ready.
   */
  async getVideoByFileHash(fileHash: string): Promise<{ videoId: string, subtitleId?: string } | null> {
    const key = this.generateFileHashKey(fileHash);
    // Returns null on operational error for now
    return await this._getCacheValue<{ videoId: string, subtitleId?: string }>(key);
  }

  /**
   * Update subtitle information for an existing file hash.
   * **Note:** This method still has a potential race condition. Use `updateFileHashWithSubtitleAtomic` for critical updates.
   * @param fileHash The SHA-256 hash of the file content.
   * @param subtitleId The ID of the generated subtitle.
   * @returns True if the update was attempted (key existed), false otherwise.
   * @throws {CacheUnavailableError | CacheOperationError} If cache operations fail.
   */
  async updateFileHashWithSubtitle(fileHash: string, subtitleId: string): Promise<boolean> {
    const key = this.generateFileHashKey(fileHash);
    // Propagates errors from _getCacheValue / _setCacheValue
    const existingData = await this._getCacheValue<{ videoId: string, subtitleId?: string }>(key);

    if (!existingData) {
      console.warn(`Attempted to update subtitle for non-existent file hash: ${fileHash}`);
      return false; // Indicate key didn't exist
    }

    // Overwrite with new data including subtitleId
    await this._setCacheValue(key, { ...existingData, subtitleId }, 60 * 60 * 24 * 30);
    return true; // Indicate update was attempted
  }

  /**
   * Atomically update subtitle information for an existing file hash using WATCH/MULTI/EXEC.
   * This prevents race conditions during concurrent updates. Recommended over `updateFileHashWithSubtitle`.
   * @param fileHash The SHA-256 hash of the file content.
   * @param subtitleId The ID of the generated subtitle.
   * @returns True if the update was successful, false if the key didn't exist or the transaction failed (e.g., due to concurrent modification).
   * @throws {CacheUnavailableError | CacheOperationError} If initial checks or the transaction execution fails.
   */
  async updateFileHashWithSubtitleAtomic(fileHash: string, subtitleId: string): Promise<boolean> {
    const key = this.generateFileHashKey(fileHash);
    this.checkConnection(); // Check connection before starting transaction

    const client = redisClient.multi(); // Use MULTI for pipelining, WATCH handles atomicity check

    try {
      await redisClient.watch(key); // Watch the key for changes

      const currentValue = await redisClient.get(key); // Get value *after* watching
      if (!currentValue) {
        console.warn(`Attempted atomic update for non-existent file hash: ${fileHash}`);
        await redisClient.unwatch(); // Stop watching if key doesn't exist
        return false;
      }

      let existingData: { videoId: string, subtitleId?: string };
      try {
        existingData = JSON.parse(currentValue);
      } catch (parseError: any) {
        console.error(`Failed to parse existing data for file hash ${fileHash}:`, parseError);
        await redisClient.unwatch();
        throw new CacheOperationError(`Failed to parse existing JSON data for key ${key}`, parseError);
      }

      // Prepare the update within the transaction pipeline
      const newData = { ...existingData, subtitleId };
      // Use the same TTL as the original storeFileHash (30 days)
      const expirationSeconds = 60 * 60 * 24 * 30;
      client.set(key, JSON.stringify(newData), 'EX', expirationSeconds);

      // Execute the transaction
      const results = await client.exec();

      // exec returns null if WATCH detected a change (transaction aborted)
      // or an array of results (one per command) if successful.
      if (results === null) {
        console.warn(`Atomic update failed for file hash ${fileHash} due to concurrent modification.`);
        return false; // Transaction aborted
      }

      // Check for errors within transaction results (though SET usually just returns 'OK')
      // results is an array of tuples [error, result]
      if (results.length > 0 && results[0][0]) { // Check error field of the first command result
         const txError = results[0][0] as Error;
         console.error(`Error during atomic SET for file hash ${fileHash}:`, txError);
         throw new CacheOperationError(`Error during atomic SET operation for key ${key}`, txError);
      }

      return true; // Transaction succeeded

    } catch (error: any) {
       // Catch errors from WATCH, GET, UNWATCH, or EXEC itself
       console.error(`Error during atomic update transaction for file hash ${fileHash}:`, error);
       // Ensure unwatch is called on error if possible
       try { await redisClient.unwatch(); } catch (unwatchError) { console.error("Failed to unwatch after error:", unwatchError); }

       if (error instanceof CacheOperationError || error instanceof CacheUnavailableError) {
         throw error; // Re-throw known cache errors
       }
       // Wrap unexpected errors
       throw new CacheOperationError(`Unexpected error during atomic update for key ${key}`, error);
    }
  }


  /**
   * Delete a file hash from Redis.
   * @param fileHash The SHA-256 hash of the file content.
   * @throws {CacheUnavailableError | CacheOperationError}
   */
  async deleteFileHash(fileHash: string): Promise<void> {
    const key = this.generateFileHashKey(fileHash);
    await this._deleteCacheValue(key);
  }
}

// Export a singleton instance
export default new RedisService();
