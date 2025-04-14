import IORedis from 'ioredis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Default expiration time (e.g., 1 hour)
const DEFAULT_EXPIRATION_TIME = 3600;

// Redis connection options
const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1', // Use REDIS_HOST from .env
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Let ioredis handle reconnection attempts
};

// Create Redis client instance
const redisClient = new IORedis(redisOptions);

redisClient.on('connect', () => {
  console.log('Connected to Redis server');
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
  // Note: ioredis will automatically try to reconnect
});

/**
 * Set a value in the Redis cache with expiration
 * @param key Cache key
 * @param value Value to cache
 * @param expirationInSeconds Expiration time in seconds (defaults to 1 hour)
 */
export const setCacheValue = async (
  key: string,
  value: any,
  expirationInSeconds: number = DEFAULT_EXPIRATION_TIME
): Promise<void> => {
  try {
    // Store directly in Redis
    await redisClient.set(key, JSON.stringify(value), 'EX', expirationInSeconds);
  } catch (error) {
    console.error(`Redis Error: Failed setting cache value for key ${key}:`, error);
    // Optionally re-throw or handle specific errors if needed
    // throw error; // Or handle silently depending on requirements
  }
};

/**
 * Get a value from the Redis cache
 * @param key Cache key
 * @returns Cached value or null if not found or on error
 */
export const getCacheValue = async <T>(key: string): Promise<T | null> => {
  try {
    // Get directly from Redis
    const redisValue = await redisClient.get(key);
    if (redisValue) {
      // console.log(`Redis cache hit for key ${key}`);
      return JSON.parse(redisValue) as T;
    }
    // console.log(`Cache miss for key ${key}`);
    return null;
  } catch (error) {
    console.error(`Redis Error: Failed getting cache value for key ${key}:`, error);
    return null; // Return null on error to avoid breaking application flow
  }
};

/**
 * Delete a value from the Redis cache
 * @param key Cache key
 */
export const deleteCacheValue = async (key: string): Promise<void> => {
  try {
    // Delete directly from Redis
    await redisClient.del(key);
  } catch (error) {
    console.error(`Redis Error: Failed deleting cache value for key ${key}:`, error);
    // Optionally re-throw or handle specific errors
  }
};

/**
 * Delete multiple values from the Redis cache using pattern (Use with caution)
 * @param pattern Key pattern to match (e.g., "video:*")
 */
export const deleteCachePattern = async (pattern: string): Promise<void> => {
  try {
    // Delete matching keys from Redis using SCAN
    let cursor = '0';
    do {
      const reply = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
      cursor = reply[0];
      const keys = reply[1];
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } while (cursor !== '0');
    console.log(`Redis: Deleted keys matching pattern ${pattern}`);
  } catch (error) {
    console.error(`Redis Error: Failed deleting cache values for pattern ${pattern}:`, error);
    // Optionally re-throw or handle specific errors
  }
};

/**
 * Generate a cache key for a video
 * @param videoId Video ID
 * @returns Cache key
 */
export const generateVideoKey = (videoId: string): string => {
  return `video:${videoId}`;
};

/**
 * Generate a cache key for subtitles
 * @param videoId Video ID
 * @returns Cache key
 */
export const generateSubtitleKey = (videoId: string): string => {
  return `subtitle:${videoId}`;
};

// Export client and cache helpers
export { redisClient, DEFAULT_EXPIRATION_TIME };
