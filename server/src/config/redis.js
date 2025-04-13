"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheConfig = exports.memoryCache = exports.redisClient = exports.generateSubtitleKey = exports.generateVideoKey = exports.deleteCachePattern = exports.deleteCacheValue = exports.getCacheValue = exports.setCacheValue = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const memoryCache_1 = require("./memoryCache");
Object.defineProperty(exports, "memoryCache", { enumerable: true, get: function () { return memoryCache_1.memoryCache; } });
Object.defineProperty(exports, "cacheConfig", { enumerable: true, get: function () { return memoryCache_1.cacheConfig; } });
// Load environment variables
dotenv_1.default.config();
// Cache options
const cacheOptions = {
    // Default expiration time for cache entries (1 hour in seconds)
    defaultExpirationTime: memoryCache_1.cacheConfig.defaultExpirationTime,
};
// No Redis client - using in-memory cache only
const redisClient = null;
exports.redisClient = redisClient;
console.log('Using in-memory cache for all caching operations');
/**
 * Set a value in the cache with expiration
 * @param key Cache key
 * @param value Value to cache
 * @param expirationInSeconds Expiration time in seconds (defaults to 1 hour)
 */
const setCacheValue = (key_1, value_1, ...args_1) => __awaiter(void 0, [key_1, value_1, ...args_1], void 0, function* (key, value, expirationInSeconds = memoryCache_1.cacheConfig.defaultExpirationTime) {
    try {
        // Store in memory cache
        memoryCache_1.memoryCache.set(key, value, expirationInSeconds);
    }
    catch (error) {
        console.error(`Error setting cache value for key ${key}:`, error);
        // Don't throw, just log the error - we don't want to break the application flow
    }
});
exports.setCacheValue = setCacheValue;
/**
 * Get a value from the cache
 * @param key Cache key
 * @returns Cached value or null if not found
 */
const getCacheValue = (key) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get from memory cache
        return memoryCache_1.memoryCache.get(key);
    }
    catch (error) {
        console.error(`Error getting cache value for key ${key}:`, error);
        return null;
    }
});
exports.getCacheValue = getCacheValue;
/**
 * Delete a value from the cache
 * @param key Cache key
 */
const deleteCacheValue = (key) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Delete from memory cache
        memoryCache_1.memoryCache.delete(key);
    }
    catch (error) {
        console.error(`Error deleting cache value for key ${key}:`, error);
    }
});
exports.deleteCacheValue = deleteCacheValue;
/**
 * Delete multiple values from the cache using pattern
 * @param pattern Key pattern to match (e.g., "video:*")
 */
const deleteCachePattern = (pattern) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Delete matching keys from memory cache
        memoryCache_1.memoryCache.deletePattern(pattern);
    }
    catch (error) {
        console.error(`Error deleting cache values for pattern ${pattern}:`, error);
    }
});
exports.deleteCachePattern = deleteCachePattern;
/**
 * Generate a cache key for a video
 * @param videoId Video ID
 * @returns Cache key
 */
const generateVideoKey = (videoId) => {
    return `video:${videoId}`;
};
exports.generateVideoKey = generateVideoKey;
/**
 * Generate a cache key for subtitles
 * @param videoId Video ID
 * @returns Cache key
 */
const generateSubtitleKey = (videoId) => {
    return `subtitle:${videoId}`;
};
exports.generateSubtitleKey = generateSubtitleKey;
