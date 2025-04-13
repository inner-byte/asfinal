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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const redis_1 = require("../config/redis");
/**
 * Redis Service for caching video and subtitle data
 */
class RedisService {
    /**
     * Cache a video object
     * @param video Video object to cache
     * @param expirationInSeconds Optional expiration time in seconds
     */
    cacheVideo(video, expirationInSeconds) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = (0, redis_1.generateVideoKey)(video.id);
            yield (0, redis_1.setCacheValue)(key, video, expirationInSeconds);
        });
    }
    /**
     * Get a cached video by ID
     * @param videoId Video ID
     * @returns Cached video or null if not found
     */
    getCachedVideo(videoId) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = (0, redis_1.generateVideoKey)(videoId);
            return yield (0, redis_1.getCacheValue)(key);
        });
    }
    /**
     * Cache subtitle data for a video
     * @param videoId Video ID
     * @param subtitleData Subtitle data to cache
     * @param expirationInSeconds Optional expiration time in seconds
     */
    cacheSubtitle(videoId, subtitleData, expirationInSeconds) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = (0, redis_1.generateSubtitleKey)(videoId);
            yield (0, redis_1.setCacheValue)(key, subtitleData, expirationInSeconds);
        });
    }
    /**
     * Get cached subtitle data for a video
     * @param videoId Video ID
     * @returns Cached subtitle data or null if not found
     */
    getCachedSubtitle(videoId) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = (0, redis_1.generateSubtitleKey)(videoId);
            return yield (0, redis_1.getCacheValue)(key);
        });
    }
    /**
     * Delete a cached video
     * @param videoId Video ID
     */
    deleteCachedVideo(videoId) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = (0, redis_1.generateVideoKey)(videoId);
            yield (0, redis_1.deleteCacheValue)(key);
        });
    }
    /**
     * Delete cached subtitle data for a video
     * @param videoId Video ID
     */
    deleteCachedSubtitle(videoId) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = (0, redis_1.generateSubtitleKey)(videoId);
            yield (0, redis_1.deleteCacheValue)(key);
        });
    }
    /**
     * Delete all cached data for a video (both video and subtitles)
     * @param videoId Video ID
     */
    deleteAllCachedVideoData(videoId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.deleteCachedVideo(videoId);
            yield this.deleteCachedSubtitle(videoId);
        });
    }
    /**
     * Delete all cached videos
     */
    deleteAllCachedVideos() {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, redis_1.deleteCachePattern)('video:*');
        });
    }
    /**
     * Delete all cached subtitles
     */
    deleteAllCachedSubtitles() {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, redis_1.deleteCachePattern)('subtitle:*');
        });
    }
}
exports.RedisService = RedisService;
// Export a singleton instance
exports.default = new RedisService();
