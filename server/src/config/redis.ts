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
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err: Error) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Only reconnect when the error contains "READONLY"
      return true;
    }
    return false;
  },
  enableOfflineQueue: true,
  connectTimeout: 10000, // 10 seconds
  lazyConnect: false, // Connect immediately
};

// Create Redis client instance
let redisClient: IORedis;

try {
  // Create Redis client with the configured options
  redisClient = new IORedis(redisOptions);

  // Set up event listeners
  redisClient.on('connect', () => {
    console.log('Connected to Redis server');
  });

  redisClient.on('ready', () => {
    console.log('Redis client ready');
  });

  redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
    // Note: ioredis will automatically try to reconnect
  });

  redisClient.on('reconnecting', () => {
    console.log('Redis client reconnecting...');
  });

  redisClient.on('close', () => {
    console.log('Redis connection closed');
  });

  redisClient.on('end', () => {
    console.log('Redis connection ended');
  });

  // No need to explicitly connect when lazyConnect is false
  // IORedis will automatically connect when created
  console.log('Redis client created with auto-connect enabled');
} catch (error) {
  console.error('Error creating Redis client:', error);
  // Create a dummy client that doesn't actually connect to Redis
  // This allows the application to start even if Redis is not available
  console.warn('Creating fallback Redis client - caching will be disabled');
  redisClient = new IORedis(null as any);
}

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
    // Check if Redis is connected
    if (redisClient.status !== 'ready') {
      console.warn(`Redis not ready, skipping cache set for key ${key}`);
      return;
    }

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
    // Check if Redis is connected
    if (redisClient.status !== 'ready') {
      console.warn(`Redis not ready, skipping cache get for key ${key}`);
      return null;
    }

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
    // Check if Redis is connected
    if (redisClient.status !== 'ready') {
      console.warn(`Redis not ready, skipping cache delete for key ${key}`);
      return;
    }

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
    // Check if Redis is connected
    if (redisClient.status !== 'ready') {
      console.warn(`Redis not ready, skipping cache pattern delete for pattern ${pattern}`);
      return;
    }

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
