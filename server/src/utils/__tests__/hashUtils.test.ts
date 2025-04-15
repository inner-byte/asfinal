import { generateFileHash } from '../hashUtils';

describe('hashUtils', () => {
  describe('generateFileHash', () => {
    it('should generate a consistent hash for the same content', () => {
      const buffer1 = Buffer.from('test content');
      const buffer2 = Buffer.from('test content');
      
      const hash1 = generateFileHash(buffer1);
      const hash2 = generateFileHash(buffer2);
      
      expect(hash1).toBe(hash2);
    });
    
    it('should generate different hashes for different content', () => {
      const buffer1 = Buffer.from('test content 1');
      const buffer2 = Buffer.from('test content 2');
      
      const hash1 = generateFileHash(buffer1);
      const hash2 = generateFileHash(buffer2);
      
      expect(hash1).not.toBe(hash2);
    });
    
    it('should generate a hash of the expected length', () => {
      const buffer = Buffer.from('test content');
      const hash = generateFileHash(buffer);
      
      // SHA-256 hash should be 64 characters long in hex format
      expect(hash).toHaveLength(64);
    });
  });
});
