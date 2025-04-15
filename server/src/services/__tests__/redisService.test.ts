import redisService from '../redisService';
import { setCacheValue, getCacheValue } from '../../config/redis';

// Mock the Redis functions
jest.mock('../../config/redis', () => ({
  setCacheValue: jest.fn(),
  getCacheValue: jest.fn(),
  deleteCacheValue: jest.fn(),
  deleteCachePattern: jest.fn(),
  generateVideoKey: jest.fn((id) => `video:${id}`),
  generateSubtitleKey: jest.fn((id) => `subtitle:${id}`),
  redisClient: {
    status: 'ready'
  },
  DEFAULT_EXPIRATION_TIME: 3600
}));

describe('RedisService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('storeFileHash', () => {
    it('should store a file hash with video data', async () => {
      const fileHash = 'test-hash';
      const videoData = { videoId: 'test-video-id' };
      
      await redisService.storeFileHash(fileHash, videoData);
      
      expect(setCacheValue).toHaveBeenCalledWith(
        `file:hash:${fileHash}`,
        videoData,
        60 * 60 * 24 * 30 // 30 days
      );
    });
    
    it('should store a file hash with video and subtitle data', async () => {
      const fileHash = 'test-hash';
      const videoData = { videoId: 'test-video-id', subtitleId: 'test-subtitle-id' };
      
      await redisService.storeFileHash(fileHash, videoData);
      
      expect(setCacheValue).toHaveBeenCalledWith(
        `file:hash:${fileHash}`,
        videoData,
        60 * 60 * 24 * 30 // 30 days
      );
    });
    
    it('should use custom expiration time if provided', async () => {
      const fileHash = 'test-hash';
      const videoData = { videoId: 'test-video-id' };
      const customExpiration = 7200; // 2 hours
      
      await redisService.storeFileHash(fileHash, videoData, customExpiration);
      
      expect(setCacheValue).toHaveBeenCalledWith(
        `file:hash:${fileHash}`,
        videoData,
        customExpiration
      );
    });
  });
  
  describe('getVideoByFileHash', () => {
    it('should return video data if hash exists', async () => {
      const fileHash = 'test-hash';
      const videoData = { videoId: 'test-video-id' };
      
      (getCacheValue as jest.Mock).mockResolvedValue(videoData);
      
      const result = await redisService.getVideoByFileHash(fileHash);
      
      expect(getCacheValue).toHaveBeenCalledWith(`file:hash:${fileHash}`);
      expect(result).toEqual(videoData);
    });
    
    it('should return null if hash does not exist', async () => {
      const fileHash = 'test-hash';
      
      (getCacheValue as jest.Mock).mockResolvedValue(null);
      
      const result = await redisService.getVideoByFileHash(fileHash);
      
      expect(getCacheValue).toHaveBeenCalledWith(`file:hash:${fileHash}`);
      expect(result).toBeNull();
    });
  });
  
  describe('updateFileHashWithSubtitle', () => {
    it('should update existing hash with subtitle ID', async () => {
      const fileHash = 'test-hash';
      const subtitleId = 'test-subtitle-id';
      const existingData = { videoId: 'test-video-id' };
      
      (getCacheValue as jest.Mock).mockResolvedValue(existingData);
      
      const result = await redisService.updateFileHashWithSubtitle(fileHash, subtitleId);
      
      expect(getCacheValue).toHaveBeenCalledWith(`file:hash:${fileHash}`);
      expect(setCacheValue).toHaveBeenCalledWith(
        `file:hash:${fileHash}`,
        { ...existingData, subtitleId },
        60 * 60 * 24 * 30 // 30 days
      );
      expect(result).toBe(true);
    });
    
    it('should return false if hash does not exist', async () => {
      const fileHash = 'test-hash';
      const subtitleId = 'test-subtitle-id';
      
      (getCacheValue as jest.Mock).mockResolvedValue(null);
      
      const result = await redisService.updateFileHashWithSubtitle(fileHash, subtitleId);
      
      expect(getCacheValue).toHaveBeenCalledWith(`file:hash:${fileHash}`);
      expect(setCacheValue).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
});
