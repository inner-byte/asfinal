import { Client, Storage, Databases } from 'node-appwrite';
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

// Export initialized services
export {
  client,
  storage,
  databases
};

// Export bucket and collection IDs
export const VIDEOS_BUCKET_ID = process.env.APPWRITE_VIDEOS_BUCKET_ID || '';
export const SUBTITLES_BUCKET_ID = process.env.APPWRITE_SUBTITLES_BUCKET_ID || '';
export const VIDEOS_COLLECTION_ID = process.env.APPWRITE_VIDEOS_COLLECTION_ID || '';
export const SUBTITLES_COLLECTION_ID = process.env.APPWRITE_SUBTITLES_COLLECTION_ID || '';