import { redisClient } from '../config/redis';

/**
 * Interface for Redis memory usage information
 */
export interface RedisMemoryInfo {
  usedMemory: number;
  usedMemoryHuman: string;
  usedMemoryPeak: number;
  usedMemoryPeakHuman: string;
  usedMemoryRss: number;
  usedMemoryRssHuman: string;
  totalSystemMemory?: number;
  totalSystemMemoryHuman?: string;
  memoryFragmentationRatio: number;
  maxmemory: number;
  maxmemoryHuman: string;
  maxmemoryPolicy: string;
  memoryUsagePercentage: number;
}

/**
 * Interface for Redis key statistics
 */
export interface RedisKeyStats {
  totalKeys: number;
  keysByPrefix: Record<string, number>;
  expiringKeys: number;
  persistentKeys: number;
}

/**
 * Interface for file hash statistics
 */
export interface FileHashStats {
  totalHashes: number;
  hashesWithSubtitles: number;
  hashesWithoutSubtitles: number;
  averageTtl: number; // in seconds
  oldestHash: {
    key: string;
    ttl: number; // in seconds
  } | null;
  newestHash: {
    key: string;
    ttl: number; // in seconds
  } | null;
}

/**
 * Service for monitoring Redis memory usage and statistics
 */
export class RedisMonitoringService {
  /**
   * Get Redis memory usage information
   * @returns Redis memory usage information or null if Redis is not available
   */
  async getMemoryInfo(): Promise<RedisMemoryInfo | null> {
    try {
      if (redisClient.status !== 'ready') {
        console.warn('Redis not ready, cannot get memory info');
        return null;
      }

      // Get Redis memory information using INFO command
      const info = await redisClient.info('memory');
      const lines = info.split('\r\n');
      const memoryInfo: Record<string, string> = {};

      // Parse the INFO output
      lines.forEach(line => {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value) {
            memoryInfo[key] = value;
          }
        }
      });

      // Get maxmemory configuration
      const maxmemory = parseInt(await redisClient.config('GET', 'maxmemory').then(res => res[1]), 10) || 0;
      const maxmemoryPolicy = await redisClient.config('GET', 'maxmemory-policy').then(res => res[1]);

      // Calculate memory usage percentage
      const usedMemory = parseInt(memoryInfo['used_memory'], 10);
      const memoryUsagePercentage = maxmemory > 0 ? (usedMemory / maxmemory) * 100 : 0;

      return {
        usedMemory,
        usedMemoryHuman: memoryInfo['used_memory_human'],
        usedMemoryPeak: parseInt(memoryInfo['used_memory_peak'], 10),
        usedMemoryPeakHuman: memoryInfo['used_memory_peak_human'],
        usedMemoryRss: parseInt(memoryInfo['used_memory_rss'], 10),
        usedMemoryRssHuman: memoryInfo['used_memory_rss_human'],
        totalSystemMemory: memoryInfo['total_system_memory'] ? parseInt(memoryInfo['total_system_memory'], 10) : undefined,
        totalSystemMemoryHuman: memoryInfo['total_system_memory_human'],
        memoryFragmentationRatio: parseFloat(memoryInfo['mem_fragmentation_ratio']),
        maxmemory,
        maxmemoryHuman: this.formatBytes(maxmemory),
        maxmemoryPolicy,
        memoryUsagePercentage
      };
    } catch (error) {
      console.error('Error getting Redis memory info:', error);
      return null;
    }
  }

  /**
   * Get Redis key statistics
   * @returns Redis key statistics or null if Redis is not available
   */
  async getKeyStats(): Promise<RedisKeyStats | null> {
    try {
      if (redisClient.status !== 'ready') {
        console.warn('Redis not ready, cannot get key stats');
        return null;
      }

      // Get total number of keys
      const dbSize = await redisClient.dbsize();

      // Initialize key statistics
      const keysByPrefix: Record<string, number> = {
        'video:': 0,
        'subtitle:': 0,
        'file:hash:': 0,
        'bull:': 0,
        'other:': 0
      };

      let expiringKeys = 0;
      let persistentKeys = 0;

      // Scan all keys and categorize them
      let cursor = '0';
      do {
        const reply = await redisClient.scan(cursor, 'COUNT', '100');
        cursor = reply[0];
        const keys = reply[1];

        // Process each key
        for (const key of keys) {
          // Categorize by prefix
          let categorized = false;
          for (const prefix of Object.keys(keysByPrefix)) {
            if (key.startsWith(prefix)) {
              keysByPrefix[prefix]++;
              categorized = true;
              break;
            }
          }

          if (!categorized) {
            keysByPrefix['other:']++;
          }

          // Check if key has an expiration
          const ttl = await redisClient.ttl(key);
          if (ttl > 0) {
            expiringKeys++;
          } else if (ttl === -1) {
            persistentKeys++;
          }
        }
      } while (cursor !== '0');

      return {
        totalKeys: dbSize,
        keysByPrefix,
        expiringKeys,
        persistentKeys
      };
    } catch (error) {
      console.error('Error getting Redis key stats:', error);
      return null;
    }
  }

  /**
   * Get file hash statistics
   * @returns File hash statistics or null if Redis is not available
   */
  async getFileHashStats(): Promise<FileHashStats | null> {
    try {
      if (redisClient.status !== 'ready') {
        console.warn('Redis not ready, cannot get file hash stats');
        return null;
      }

      let totalHashes = 0;
      let hashesWithSubtitles = 0;
      let hashesWithoutSubtitles = 0;
      let totalTtl = 0;
      let oldestHash: { key: string; ttl: number } | null = null;
      let newestHash: { key: string; ttl: number } | null = null;

      // Scan all file hash keys
      let cursor = '0';
      do {
        const reply = await redisClient.scan(cursor, 'MATCH', 'file:hash:*', 'COUNT', '100');
        cursor = reply[0];
        const keys = reply[1];

        // Process each key
        for (const key of keys) {
          totalHashes++;

          // Get TTL
          const ttl = await redisClient.ttl(key);
          if (ttl > 0) {
            totalTtl += ttl;

            // Update oldest hash
            if (!oldestHash || ttl < oldestHash.ttl) {
              oldestHash = { key, ttl };
            }

            // Update newest hash
            if (!newestHash || ttl > newestHash.ttl) {
              newestHash = { key, ttl };
            }
          }

          // Check if hash has subtitle
          const value = await redisClient.get(key);
          if (value) {
            try {
              const data = JSON.parse(value);
              if (data.subtitleId) {
                hashesWithSubtitles++;
              } else {
                hashesWithoutSubtitles++;
              }
            } catch (e) {
              console.warn(`Error parsing JSON for key ${key}:`, e);
            }
          }
        }
      } while (cursor !== '0');

      const averageTtl = totalHashes > 0 ? totalTtl / totalHashes : 0;

      return {
        totalHashes,
        hashesWithSubtitles,
        hashesWithoutSubtitles,
        averageTtl,
        oldestHash,
        newestHash
      };
    } catch (error) {
      console.error('Error getting file hash stats:', error);
      return null;
    }
  }

  /**
   * Format bytes to human-readable string
   * @param bytes Number of bytes
   * @returns Human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Clean up expired file hashes and stale references
   * @param checkAppwrite Whether to check if the referenced files still exist in Appwrite
   * @returns Number of keys removed
   */
  async cleanupExpiredFileHashes(checkAppwrite: boolean = false): Promise<number> {
    try {
      if (redisClient.status !== 'ready') {
        console.warn('Redis not ready, cannot clean up expired file hashes');
        return 0;
      }

      let removedCount = 0;
      let cursor = '0';

      do {
        const reply = await redisClient.scan(cursor, 'MATCH', 'file:hash:*', 'COUNT', '100');
        cursor = reply[0];
        const keys = reply[1];

        for (const key of keys) {
          const ttl = await redisClient.ttl(key);
          let shouldRemove = false;

          // If TTL is -2, the key doesn't exist (already expired)
          // If TTL is -1, the key exists but has no expiration
          // If TTL is close to expiration (less than 1 day), remove it
          if (ttl === -2 || (ttl > 0 && ttl < 86400)) {
            shouldRemove = true;
          }

          // If we're checking Appwrite, verify the referenced files still exist
          if (checkAppwrite && !shouldRemove) {
            try {
              // Extract the hash from the key (remove the 'file:hash:' prefix)
              const fileHash = key.substring(10);

              // Get the video ID from the hash
              const value = await redisClient.get(key);
              if (value) {
                try {
                  const data = JSON.parse(value);
                  if (data.videoId) {
                    // Import these dynamically to avoid circular dependencies
                    const { databases, storage, DATABASE_ID, VIDEOS_COLLECTION_ID, VIDEOS_BUCKET_ID } = await import('../config/appwrite');

                    try {
                      // Check if the video document exists
                      const videoDoc = await databases.getDocument(
                        DATABASE_ID,
                        VIDEOS_COLLECTION_ID,
                        data.videoId
                      );

                      // Check if the file exists
                      if (videoDoc.fileId) {
                        try {
                          await storage.getFile(VIDEOS_BUCKET_ID, videoDoc.fileId);
                          // Both document and file exist, keep the hash
                        } catch (fileError) {
                          // File doesn't exist, remove the hash
                          console.log(`File ${videoDoc.fileId} for video ${data.videoId} not found in storage, removing hash ${fileHash}`);
                          shouldRemove = true;
                        }
                      }
                    } catch (docError) {
                      // Document doesn't exist, remove the hash
                      console.log(`Video document ${data.videoId} not found, removing hash ${fileHash}`);
                      shouldRemove = true;
                    }
                  }
                } catch (parseError) {
                  console.warn(`Error parsing JSON for key ${key}:`, parseError);
                  // Invalid JSON, remove the hash
                  shouldRemove = true;
                }
              }
            } catch (error) {
              console.warn(`Error checking Appwrite for key ${key}:`, error);
            }
          }

          if (shouldRemove) {
            await redisClient.del(key);
            removedCount++;
          }
        }
      } while (cursor !== '0');

      return removedCount;
    } catch (error) {
      console.error('Error cleaning up expired file hashes:', error);
      return 0;
    }
  }
}

// Export a singleton instance
export default new RedisMonitoringService();
