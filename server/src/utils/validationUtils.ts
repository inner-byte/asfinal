/**
 * Validation utilities for document creation and updates
 * Ensures that all required attributes are present before attempting to create or update documents
 */

import { AppError } from '../middleware/errorHandler';

/**
 * Required attributes for the Subtitles collection
 * This should match the required attributes in the Appwrite schema
 */
export const REQUIRED_SUBTITLE_ATTRIBUTES = [
  'videoId',
  'fileId',
  'format',
  'language',
  'name',
  'fileSize',
  'mimeType',
  'status'
];

/**
 * Validates that a subtitle document has all required attributes
 * @param document The document to validate
 * @throws AppError if any required attribute is missing
 */
export function validateSubtitleDocument(document: Record<string, any>): void {
  const missingAttributes: string[] = [];

  for (const attr of REQUIRED_SUBTITLE_ATTRIBUTES) {
    if (document[attr] === undefined) {
      missingAttributes.push(attr);
    }
  }

  if (missingAttributes.length > 0) {
    throw new AppError(
      `Invalid subtitle document structure: Missing required attributes: ${missingAttributes.join(', ')}`,
      400
    );
  }
}

/**
 * Required attributes for the Videos collection
 * This should match the required attributes in the Appwrite schema
 */
export const REQUIRED_VIDEO_ATTRIBUTES = [
  'name',
  'fileSize',
  'mimeType',
  'fileId',
  'status'
];

/**
 * Validates that a video document has all required attributes
 * @param document The document to validate
 * @throws AppError if any required attribute is missing
 */
export function validateVideoDocument(document: Record<string, any>): void {
  const missingAttributes: string[] = [];

  for (const attr of REQUIRED_VIDEO_ATTRIBUTES) {
    if (document[attr] === undefined) {
      missingAttributes.push(attr);
    }
  }

  if (missingAttributes.length > 0) {
    throw new AppError(
      `Invalid video document structure: Missing required attributes: ${missingAttributes.join(', ')}`,
      400
    );
  }
}
