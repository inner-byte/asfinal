import crypto from 'crypto';

/**
 * Generates a SHA-256 hash of a file buffer
 * @param buffer The file buffer to hash
 * @returns The hex-encoded hash string
 */
export function generateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
