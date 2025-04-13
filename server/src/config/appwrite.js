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
exports.SUBTITLES_COLLECTION_ID = exports.VIDEOS_COLLECTION_ID = exports.SUBTITLES_BUCKET_ID = exports.VIDEOS_BUCKET_ID = exports.DATABASE_ID = exports.databases = exports.storage = exports.client = exports.ensureCollectionExists = exports.ensureBucketExists = exports.createFilePermissions = exports.createDocumentPermissions = void 0;
const node_appwrite_1 = require("node-appwrite");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Initialize Appwrite client
const client = new node_appwrite_1.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');
exports.client = client;
// Initialize Appwrite services
const storage = new node_appwrite_1.Storage(client);
exports.storage = storage;
const databases = new node_appwrite_1.Databases(client);
exports.databases = databases;
/**
 * Utility function to create document permissions
 * This allows setting various permission levels for different user roles
 */
const createDocumentPermissions = () => {
    return [
        // Allow any user to read this document
        node_appwrite_1.Permission.read(node_appwrite_1.Role.any()),
        // Allow the server/backend full access
        node_appwrite_1.Permission.read(node_appwrite_1.Role.users()),
        node_appwrite_1.Permission.update(node_appwrite_1.Role.users()),
        node_appwrite_1.Permission.delete(node_appwrite_1.Role.users())
        // Removed individual user permissions as they were causing an error
        // due to the invalid format of {{user.$id}}
    ];
};
exports.createDocumentPermissions = createDocumentPermissions;
/**
 * Utility function to create file permissions
 * This allows setting various permission levels for different user roles
 */
const createFilePermissions = () => {
    return [
        // Allow any user to read the file
        node_appwrite_1.Permission.read(node_appwrite_1.Role.any()),
        // Allow the server/backend full access
        node_appwrite_1.Permission.read(node_appwrite_1.Role.users()),
        node_appwrite_1.Permission.update(node_appwrite_1.Role.users()),
        node_appwrite_1.Permission.delete(node_appwrite_1.Role.users())
        // Removed individual user permissions as they were causing an error
        // due to the invalid format of {{user.$id}}
    ];
};
exports.createFilePermissions = createFilePermissions;
/**
 * Check if a bucket exists, and create it if it doesn't
 */
const ensureBucketExists = (bucketId, bucketName) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Try to get the bucket to see if it exists
        yield storage.getBucket(bucketId);
        console.log(`Bucket ${bucketId} already exists`);
    }
    catch (error) {
        // If the bucket doesn't exist, create it
        console.log(`Bucket ${bucketId} not found, creating it...`);
        yield storage.createBucket(bucketId, bucketName, [
            node_appwrite_1.Permission.read(node_appwrite_1.Role.any()),
            node_appwrite_1.Permission.create(node_appwrite_1.Role.users()),
            node_appwrite_1.Permission.update(node_appwrite_1.Role.users()),
            node_appwrite_1.Permission.delete(node_appwrite_1.Role.users())
        ], true, // File security
        true, // Enabled
        2147483648, // Maximum file size (2GB - Appwrite's actual limit)
        ['video/*', 'application/octet-stream']);
        console.log(`Bucket ${bucketId} created successfully`);
    }
});
exports.ensureBucketExists = ensureBucketExists;
/**
 * Check if a collection exists, and create it if it doesn't
 */
const ensureCollectionExists = (databaseId, collectionId, collectionName) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Try to get the collection to see if it exists
        yield databases.getCollection(databaseId, collectionId);
        console.log(`Collection ${collectionId} already exists`);
    }
    catch (error) {
        // If the collection doesn't exist, create it
        console.log(`Collection ${collectionId} not found, creating it...`);
        yield databases.createCollection(databaseId, collectionId, collectionName, [
            node_appwrite_1.Permission.read(node_appwrite_1.Role.any()),
            node_appwrite_1.Permission.create(node_appwrite_1.Role.users()),
            node_appwrite_1.Permission.update(node_appwrite_1.Role.users()),
            node_appwrite_1.Permission.delete(node_appwrite_1.Role.users())
        ], true, // Enabled
        true // Enable document security with custom permissions per document
        );
        console.log(`Collection ${collectionId} created successfully`);
    }
});
exports.ensureCollectionExists = ensureCollectionExists;
// Export bucket and collection IDs
exports.DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '';
exports.VIDEOS_BUCKET_ID = process.env.APPWRITE_VIDEOS_BUCKET_ID || '';
exports.SUBTITLES_BUCKET_ID = process.env.APPWRITE_SUBTITLES_BUCKET_ID || '';
exports.VIDEOS_COLLECTION_ID = process.env.APPWRITE_VIDEOS_COLLECTION_ID || '';
exports.SUBTITLES_COLLECTION_ID = process.env.APPWRITE_SUBTITLES_COLLECTION_ID || '';
