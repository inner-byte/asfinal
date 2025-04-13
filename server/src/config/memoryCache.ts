import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Cache configuration
const cacheConfig = {
  // Default expiration time for cache entries (1 hour in seconds)
  defaultExpirationTime: parseInt(process.env.CACHE_DEFAULT_EXPIRATION || '3600'),
  // Maximum number of items to store in the cache
  maxItems: parseInt(process.env.CACHE_MAX_ITEMS || '1000'),
  // Whether to enable cache cleanup
  enableCleanup: process.env.CACHE_ENABLE_CLEANUP !== 'false',
  // Cleanup interval in milliseconds (default: 5 minutes)
  cleanupInterval: parseInt(process.env.CACHE_CLEANUP_INTERVAL || '300000'),
};

// Cache entry type
interface CacheEntry<T> {
  value: T;
  expiry: number | null; // Timestamp when the entry expires, or null for no expiration
  lastAccessed: number; // Timestamp when the entry was last accessed
}

/**
 * Enhanced in-memory cache with LRU (Least Recently Used) eviction policy
 */
class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup timer if enabled
    if (cacheConfig.enableCleanup) {
      this.startCleanupTimer();
    }
    console.log('Memory cache initialized with config:', cacheConfig);
  }

  /**
   * Set a value in the cache with expiration
   * @param key Cache key
   * @param value Value to cache
   * @param expirationInSeconds Expiration time in seconds (defaults to config value)
   */
  set<T>(key: string, value: T, expirationInSeconds: number = cacheConfig.defaultExpirationTime): void {
    try {
      // Check if we need to evict items
      if (this.cache.size >= cacheConfig.maxItems && !this.cache.has(key)) {
        this.evictLRU();
      }

      // Calculate expiry timestamp
      const expiry = expirationInSeconds ? Date.now() + (expirationInSeconds * 1000) : null;
      
      // Store the value
      this.cache.set(key, {
        value,
        expiry,
        lastAccessed: Date.now()
      });
    } catch (error) {
      console.error(`Error setting cache value for key ${key}:`, error);
      // Don't throw, just log the error - we don't want to break the application flow
    }
  }

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns Cached value or null if not found or expired
   */
  get<T>(key: string): T | null {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        return null;
      }

      // Check if the entry has expired
      if (entry.expiry && entry.expiry < Date.now()) {
        // Expired, remove it
        this.cache.delete(key);
        return null;
      }

      // Update last accessed time
      entry.lastAccessed = Date.now();
      
      return entry.value as T;
    } catch (error) {
      console.error(`Error getting cache value for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a value from the cache
   * @param key Cache key
   */
  delete(key: string): void {
    try {
      this.cache.delete(key);
    } catch (error) {
      console.error(`Error deleting cache value for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple values from the cache using pattern
   * @param pattern Key pattern to match (e.g., "video:*")
   */
  deletePattern(pattern: string): void {
    try {
      const regex = new RegExp(pattern.replace('*', '.*'));
      
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } catch (error) {
      console.error(`Error deleting cache values for pattern ${pattern}:`, error);
    }
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    try {
      this.cache.clear();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get the number of items in the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Check if a key exists in the cache
   * @param key Cache key
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if the entry has expired
    if (entry.expiry && entry.expiry < Date.now()) {
      // Expired, remove it
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Evict the least recently used item from the cache
   * @private
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    // Find the least recently used item
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    // Delete the oldest item
    if (oldestKey) {
      console.log(`Cache full, evicting LRU item: ${oldestKey}`);
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Start the cleanup timer to remove expired items
   * @private
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, cacheConfig.cleanupInterval);
  }

  /**
   * Clean up expired items from the cache
   * @private
   */
  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry && entry.expiry < now) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`Cache cleanup: removed ${expiredCount} expired items`);
    }
  }

  /**
   * Stop the cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Create a singleton instance
const memoryCache = new MemoryCache();

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

// Export the memory cache instance and configuration
export { memoryCache, cacheConfig };
