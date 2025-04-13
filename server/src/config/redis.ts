import dotenv from 'dotenv';
import { memoryCache, cacheConfig } from './memoryCache';

// Load environment variables
dotenv.config();

// Cache options
const cacheOptions = {
  // Default expiration time for cache entries (1 hour in seconds)
  defaultExpirationTime: cacheConfig.defaultExpirationTime,
};

// No Redis client - using in-memory cache only
const redisClient = null;

console.log('Using in-memory cache for all caching operations');

/**
 * Set a value in the cache with expiration
 * @param key Cache key
 * @param value Value to cache
 * @param expirationInSeconds Expiration time in seconds (defaults to 1 hour)
 */
export const setCacheValue = async (
  key: string,
  value: any,
  expirationInSeconds: number = cacheConfig.defaultExpirationTime
): Promise<void> => {
  try {
    // Store in memory cache
    memoryCache.set(key, value, expirationInSeconds);
  } catch (error) {
    console.error(`Error setting cache value for key ${key}:`, error);
    // Don't throw, just log the error - we don't want to break the application flow
  }
};

/**
 * Get a value from the cache
 * @param key Cache key
 * @returns Cached value or null if not found
 */
export const getCacheValue = async <T>(key: string): Promise<T | null> => {
  try {
    // Get from memory cache
    return memoryCache.get<T>(key);
  } catch (error) {
    console.error(`Error getting cache value for key ${key}:`, error);
    return null;
  }
};

/**
 * Delete a value from the cache
 * @param key Cache key
 */
export const deleteCacheValue = async (key: string): Promise<void> => {
  try {
    // Delete from memory cache
    memoryCache.delete(key);
  } catch (error) {
    console.error(`Error deleting cache value for key ${key}:`, error);
  }
};

/**
 * Delete multiple values from the cache using pattern
 * @param pattern Key pattern to match (e.g., "video:*")
 */
export const deleteCachePattern = async (pattern: string): Promise<void> => {
  try {
    // Delete matching keys from memory cache
    memoryCache.deletePattern(pattern);
  } catch (error) {
    console.error(`Error deleting cache values for pattern ${pattern}:`, error);
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

// Export client and cache
export { redisClient, memoryCache, cacheConfig };
