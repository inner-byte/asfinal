import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';

// Initialize GCS Storage client
// The client will use credentials from GOOGLE_APPLICATION_CREDENTIALS environment variable
const storage = new Storage();

// Get bucket name from environment variables
const BUCKET_NAME = process.env.BACKEND_GCS_BUCKET_NAME || '';

/**
 * Validates GCS configuration
 * @returns boolean indicating if the GCS configuration is valid
 */
export function validateGcsConfig(): boolean {
  if (!BUCKET_NAME) {
    console.error('[GCS] Error: BACKEND_GCS_BUCKET_NAME environment variable is not set.');
    return false;
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn('[GCS] Warning: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. Default credentials will be used.');
    // Not returning false as default credentials might work in some environments
  }

  return true;
}

/**
 * Uploads an audio file to the backend's GCS bucket.
 * This is an alias for uploadToGcs for backward compatibility.
 *
 * @param localPath Path to the local audio file.
 * @param destinationFileName Desired name for the file in GCS.
 * @param options Upload options
 * @returns Promise resolving with the GCS URI (gs://...).
 */
export async function uploadAudioToGcs(
  localPath: string,
  destinationFileName: string,
  options: {
    contentType?: string;
    metadata?: Record<string, string>;
  } = {}
): Promise<string> {
  return uploadToGcs(localPath, destinationFileName, options);
}

/**
 * Uploads a local file to the backend's GCS bucket.
 * @param localPath Path to the local file.
 * @param destinationFileName Optional desired name for the file in GCS. Defaults to local filename.
 * @param options Upload options
 * @returns Promise resolving with the GCS URI (gs://...).
 * @throws Error if upload fails or bucket name is not configured.
 */
export async function uploadToGcs(
  localPath: string,
  destinationFileName?: string,
  options: {
    contentType?: string;
    metadata?: Record<string, string>;
  } = {}
): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error('[GCS] Backend GCS bucket name is not configured.');
  }

  // Use provided destination filename or extract from local path
  const effectiveDestination = destinationFileName || path.basename(localPath);

  try {
    console.log(`[GCS] Uploading ${localPath} to gs://${BUCKET_NAME}/${effectiveDestination}...`);

    const uploadOptions: {
      destination: string;
      metadata?: {
        contentType?: string;
        metadata?: Record<string, string>;
      };
    } = { destination: effectiveDestination };

    // Add content type and metadata if provided
    if (options.contentType || options.metadata) {
      uploadOptions.metadata = {};

      if (options.contentType) {
        uploadOptions.metadata.contentType = options.contentType;
      }

      if (options.metadata) {
        uploadOptions.metadata.metadata = options.metadata;
      }
    }

    // Perform the upload
    await storage.bucket(BUCKET_NAME).upload(localPath, uploadOptions);

    const gcsUri = `gs://${BUCKET_NAME}/${effectiveDestination}`;
    console.log(`[GCS] File uploaded successfully to ${gcsUri}`);
    return gcsUri;
  } catch (error: any) {
    console.error(`[GCS] Upload Error: Failed to upload ${localPath} to ${BUCKET_NAME}.`, error);
    throw new Error(`[GCS] Upload failed: ${error.message}`);
  }
}

/**
 * Deletes a file from the backend's GCS bucket.
 * @param fileName The name of the file in the GCS bucket.
 * @returns Promise resolving when deletion is complete.
 */
export async function deleteFromGcs(fileName: string): Promise<void> {
  if (!BUCKET_NAME) {
    console.warn('[GCS] Backend GCS bucket name is not configured. Skipping deletion.');
    return;
  }

  try {
    console.log(`[GCS] Deleting gs://${BUCKET_NAME}/${fileName}...`);
    await storage.bucket(BUCKET_NAME).file(fileName).delete();
    console.log(`[GCS] File ${fileName} deleted successfully from GCS.`);
  } catch (error: any) {
    // Log error but don't necessarily throw, cleanup failure might not be critical
    console.error(`[GCS] Deletion Error: Failed to delete ${fileName} from ${BUCKET_NAME}.`, error);
    // Not throwing an error as deletion failures are non-critical during cleanup operations
  }
}

/**
 * Checks if a file exists in the GCS bucket.
 * @param fileName The name of the file in the GCS bucket.
 * @returns Promise resolving with a boolean indicating file existence.
 */
export async function fileExistsInGcs(fileName: string): Promise<boolean> {
  if (!BUCKET_NAME) {
    throw new Error('[GCS] Backend GCS bucket name is not configured.');
  }

  try {
    const [exists] = await storage.bucket(BUCKET_NAME).file(fileName).exists();
    return exists;
  } catch (error: any) {
    console.error(`[GCS] Error checking if file ${fileName} exists:`, error);
    throw new Error(`[GCS] Failed to check if file exists: ${error.message}`);
  }
}

/**
 * Gets a signed URL for a file in the GCS bucket with read permissions.
 * @param fileName The name of the file in the GCS bucket.
 * @param expirationMinutes Minutes until the signed URL expires (default: 60).
 * @returns Promise resolving with the signed URL.
 */
export async function getSignedUrl(fileName: string, expirationMinutes = 60): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error('[GCS] Backend GCS bucket name is not configured.');
  }

  try {
    const options = {
      version: 'v4' as const,
      action: 'read' as const,
      expires: Date.now() + expirationMinutes * 60 * 1000,
    };

    const [url] = await storage.bucket(BUCKET_NAME).file(fileName).getSignedUrl(options);
    return url;
  } catch (error: any) {
    console.error(`[GCS] Error generating signed URL for ${fileName}:`, error);
    throw new Error(`[GCS] Failed to generate signed URL: ${error.message}`);
  }
}

// Validate configuration when this module is first imported
validateGcsConfig();