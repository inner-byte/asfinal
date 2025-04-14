import { Client, Storage, Databases, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '');

// Initialize Appwrite services
const storage = new Storage(client);
const databases = new Databases(client);

/**
 * Utility function to create document permissions
 * This allows setting various permission levels for different user roles
 */
export const createDocumentPermissions = () => {
  return [
    // Allow any user to read this document
    Permission.read(Role.any()),

    // Allow the server/backend full access using the API key
    // Note: API key access is handled separately and doesn't need explicit permissions
    // These permissions are for client-side access
    Permission.read(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users())
  ];
};

/**
 * Utility function to create file permissions
 * This allows setting various permission levels for different user roles
 */
export const createFilePermissions = () => {
  return [
    // Allow any user to read the file
    Permission.read(Role.any()),

    // Allow the server/backend full access using the API key
    // Note: API key access is handled separately and doesn't need explicit permissions
    // These permissions are for client-side access
    Permission.read(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users())
  ];
};

/**
 * Check if a bucket exists, and create it if it doesn't
 */
export const ensureBucketExists = async (bucketId: string, bucketName: string) => {
  try {
    // Try to get the bucket to see if it exists
    await storage.getBucket(bucketId);
    console.log(`Bucket ${bucketId} already exists`);
  } catch (error) {
    try {
      // If the bucket doesn't exist, create it
      console.log(`Bucket ${bucketId} not found, creating it...`);
      await storage.createBucket(
        bucketId,
        bucketName,
        [
          Permission.read(Role.any()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users())
        ],
        true, // File security
        true, // Enabled
        4294967296, // Maximum file size (4GB to match project requirements)
        ['video/*', 'application/octet-stream'], // Allowed file extensions
      );
      console.log(`Bucket ${bucketId} created successfully`);
    } catch (createError: any) {
      console.error(`Failed to create bucket ${bucketId}: ${createError.message}`);
      throw createError; // Re-throw to propagate the error
    }
  }
};

/**
 * Check if a collection exists, and create it if it doesn't
 */
export const ensureCollectionExists = async (databaseId: string, collectionId: string, collectionName: string) => {
  try {
    // Try to get the collection to see if it exists
    await databases.getCollection(databaseId, collectionId);
    console.log(`Collection ${collectionId} already exists`);
  } catch (error) {
    try {
      // If the collection doesn't exist, create it
      console.log(`Collection ${collectionId} not found, creating it...`);
      await databases.createCollection(
        databaseId,
        collectionId,
        collectionName,
        [
          Permission.read(Role.any()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users())
        ],
        true, // Enabled
        true  // Enable document security with custom permissions per document
      );
      console.log(`Collection ${collectionId} created successfully`);
    } catch (createError: any) {
      console.error(`Failed to create collection ${collectionId}: ${createError.message}`);
      throw createError; // Re-throw to propagate the error
    }
  }
};

// Export initialized services
export {
  client,
  storage,
  databases
};

// Export bucket and collection IDs
export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '';
export const VIDEOS_BUCKET_ID = process.env.APPWRITE_VIDEOS_BUCKET_ID || '';
export const SUBTITLES_BUCKET_ID = process.env.APPWRITE_SUBTITLES_BUCKET_ID || '';
export const VIDEOS_COLLECTION_ID = process.env.APPWRITE_VIDEOS_COLLECTION_ID || '';
export const SUBTITLES_COLLECTION_ID = process.env.APPWRITE_SUBTITLES_COLLECTION_ID || '';