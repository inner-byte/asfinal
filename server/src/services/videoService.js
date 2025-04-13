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
exports.VideoService = void 0;
const node_appwrite_1 = require("node-appwrite");
const appwrite_1 = require("../config/appwrite");
// Import InputFile from the correct path
const file_1 = require("node-appwrite/file");
const fs_1 = __importDefault(require("fs"));
const errorHandler_1 = require("../middleware/errorHandler");
const path_1 = __importDefault(require("path"));
const redisService_1 = __importDefault(require("./redisService"));
/**
 * Service for handling video operations
 */
class VideoService {
    /**
     * Initialize a video upload
     * @param fileName Original file name
     * @param fileSize File size in bytes
     * @param mimeType File MIME type
     */
    initializeUpload(fileName, fileSize, mimeType) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate file type
                if (!mimeType.startsWith('video/')) {
                    throw new errorHandler_1.AppError('Invalid file type. Only video files are allowed.', 400);
                }
                // Validate file size (up to 4GB)
                const MAX_FILE_SIZE = 4 * 1024 * 1024 * 1024; // 4GB in bytes
                if (fileSize > MAX_FILE_SIZE) {
                    throw new errorHandler_1.AppError(`File size exceeds the maximum limit of 4GB.`, 400);
                }
                // Create a unique file ID for Appwrite storage
                const fileId = node_appwrite_1.ID.unique();
                // Create video entry in database with proper arguments (database ID, collection ID, document ID, data object)
                const video = yield appwrite_1.databases.createDocument(appwrite_1.DATABASE_ID, appwrite_1.VIDEOS_COLLECTION_ID, node_appwrite_1.ID.unique(), {
                    name: fileName,
                    fileSize,
                    mimeType,
                    fileId,
                    status: 'initialized'
                }, (0, appwrite_1.createDocumentPermissions)() // Use the permission helper function
                );
                return {
                    id: video.$id,
                    name: video.name,
                    fileSize: video.fileSize,
                    mimeType: video.mimeType,
                    fileId: video.fileId,
                    status: video.status,
                    createdAt: new Date(video.$createdAt), // Use Appwrite's built-in system field
                    updatedAt: new Date(video.$updatedAt) // Use Appwrite's built-in system field
                };
            }
            catch (error) {
                if (error instanceof errorHandler_1.AppError) {
                    throw error;
                }
                console.error('Error initializing upload:', error);
                throw new errorHandler_1.AppError(`Failed to initialize video upload: ${error.message || 'Unknown error'}`, 500);
            }
        });
    }
    /**
     * Handle file upload stream to Appwrite storage
     * @param videoId The video document ID
     * @param fileStream Readable stream of the file
     * @param fileName Original file name
     */
    handleFileUpload(videoId, fileStream, fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // First get the video document to access the fileId
                const video = yield this.getVideoById(videoId);
                // Create a temp file path for buffering the stream
                // Use the uploads directory instead of os.tmpdir()
                const uploadsDir = path_1.default.join(__dirname, '../../src/uploads');
                // Ensure the uploads directory exists
                if (!fs_1.default.existsSync(uploadsDir)) {
                    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
                }
                const tempFilePath = path_1.default.join(uploadsDir, `upload_${video.fileId}`);
                console.log(`Writing file to: ${tempFilePath}`);
                const writeStream = fs_1.default.createWriteStream(tempFilePath);
                // Stream the file to disk first (buffer)
                yield new Promise((resolve, reject) => {
                    fileStream.pipe(writeStream)
                        .on('finish', () => {
                        console.log(`File successfully written to ${tempFilePath}`);
                        resolve();
                    })
                        .on('error', (err) => {
                        console.error(`Error writing file to ${tempFilePath}:`, err);
                        reject(new errorHandler_1.AppError(`Error writing file: ${err.message}`, 500));
                    });
                });
                // Verify the file exists and has content
                if (!fs_1.default.existsSync(tempFilePath)) {
                    throw new errorHandler_1.AppError(`Temporary file was not created at ${tempFilePath}`, 500);
                }
                const fileStats = fs_1.default.statSync(tempFilePath);
                console.log(`File size: ${fileStats.size} bytes`);
                if (fileStats.size === 0) {
                    throw new errorHandler_1.AppError('Uploaded file is empty', 400);
                }
                // Upload the file from disk to Appwrite storage
                try {
                    // Use InputFile.fromPath to create a File object from the file path
                    const file = file_1.InputFile.fromPath(tempFilePath, fileName);
                    console.log(`Uploading file to Appwrite bucket: ${appwrite_1.VIDEOS_BUCKET_ID}, fileId: ${video.fileId}`);
                    yield appwrite_1.storage.createFile(appwrite_1.VIDEOS_BUCKET_ID, video.fileId, file, (0, appwrite_1.createFilePermissions)() // Use the permission helper function
                    );
                    console.log('File successfully uploaded to Appwrite storage');
                }
                catch (error) {
                    console.error('Error uploading to Appwrite:', error);
                    throw new errorHandler_1.AppError(`Failed to upload to Appwrite: ${error.message || 'Unknown error'}`, 500);
                }
                // Clean up the temp file
                try {
                    fs_1.default.unlinkSync(tempFilePath);
                    console.log(`Temporary file ${tempFilePath} deleted`);
                }
                catch (error) {
                    console.warn(`Warning: Could not delete temporary file: ${error.message || 'Unknown error'}`);
                    // Continue execution even if cleanup fails
                }
                // Update the video document with any additional information if needed
                try {
                    yield appwrite_1.databases.updateDocument(appwrite_1.DATABASE_ID, appwrite_1.VIDEOS_COLLECTION_ID, videoId, {
                        // Update status to indicate the upload is complete
                        status: 'uploaded'
                    }, (0, appwrite_1.createDocumentPermissions)() // Use the permission helper function
                    );
                    console.log('Video document updated in database');
                }
                catch (error) {
                    console.error('Error updating video document:', error);
                    throw new errorHandler_1.AppError(`Failed to update video document: ${error.message || 'Unknown error'}`, 500);
                }
                // Invalidate the video list cache since we've added a new video
                yield redisService_1.default.deleteAllCachedVideos();
                // Return the updated video document (skip cache to get fresh data)
                return this.getVideoById(videoId, true);
            }
            catch (error) {
                console.error('Error handling file upload:', error);
                if (error instanceof errorHandler_1.AppError) {
                    throw error;
                }
                throw new errorHandler_1.AppError(`Failed to upload video file: ${error.message || 'Unknown error'}`, 500);
            }
        });
    }
    /**
     * Stream video file from storage
     * @param fileId The file ID in storage
     */
    streamVideo(fileId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get file view (download URL or file content)
                const fileView = yield appwrite_1.storage.getFileView(appwrite_1.VIDEOS_BUCKET_ID, fileId);
                return Buffer.from(fileView);
            }
            catch (error) {
                console.error('Error streaming video:', error);
                throw new errorHandler_1.AppError(`Failed to stream video: ${error.message || 'Unknown error'}`, 500);
            }
        });
    }
    /**
     * Get video download URL
     * @param videoId The video document ID
     * @returns Promise with the download URL
     */
    getVideoDownloadUrl(videoId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`Getting download URL for video ID: ${videoId}`);
                // First get the video document to access the fileId
                const video = yield this.getVideoById(videoId);
                if (!video || !video.fileId) {
                    throw new errorHandler_1.AppError(`Invalid video or missing fileId for video ID: ${videoId}`, 500);
                }
                console.log(`Found video with fileId: ${video.fileId}`);
                // Create a download URL for the file
                try {
                    const downloadUrl = yield appwrite_1.storage.getFileDownload(appwrite_1.VIDEOS_BUCKET_ID, video.fileId);
                    // Ensure we have a valid URL
                    if (!downloadUrl) {
                        throw new errorHandler_1.AppError(`Failed to generate download URL for fileId: ${video.fileId}`, 500);
                    }
                    const urlString = downloadUrl.toString();
                    // Log the URL for debugging
                    console.log(`Generated download URL for video ${videoId}: ${urlString}`);
                    return urlString;
                }
                catch (storageError) {
                    console.error(`Storage error getting download URL for fileId ${video.fileId}:`, storageError);
                    throw new errorHandler_1.AppError(`Storage error: ${storageError.message || 'Unknown storage error'}`, 500);
                }
            }
            catch (error) {
                console.error('Error getting video download URL:', error);
                throw new errorHandler_1.AppError(`Failed to get video download URL: ${error.message || 'Unknown error'}`, 500);
            }
        });
    }
    /**
     * Delete video and its file from storage
     * @param id Video document ID
     */
    deleteVideo(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const video = yield this.getVideoById(id);
                // Delete the file from storage
                yield appwrite_1.storage.deleteFile(appwrite_1.VIDEOS_BUCKET_ID, video.fileId);
                // Delete the document from database
                yield appwrite_1.databases.deleteDocument(appwrite_1.DATABASE_ID, appwrite_1.VIDEOS_COLLECTION_ID, id);
                // Invalidate caches
                yield redisService_1.default.deleteCachedVideo(id);
                yield redisService_1.default.deleteCachedSubtitle(id); // Also delete any associated subtitle cache
                yield redisService_1.default.deleteAllCachedVideos(); // Invalidate the video list cache
            }
            catch (error) {
                console.error('Error deleting video:', error);
                throw new errorHandler_1.AppError(`Failed to delete video: ${error.message || 'Unknown error'}`, 500);
            }
        });
    }
    /**
     * Get video by ID
     * @param id Video ID
     * @param skipCache Whether to skip the cache and fetch directly from the database
     */
    getVideoById(id_1) {
        return __awaiter(this, arguments, void 0, function* (id, skipCache = false) {
            try {
                // Check cache first if not skipping cache
                if (!skipCache) {
                    const cachedVideo = yield redisService_1.default.getCachedVideo(id);
                    if (cachedVideo) {
                        console.log(`Cache hit for video ID: ${id}`);
                        return cachedVideo;
                    }
                    console.log(`Cache miss for video ID: ${id}`);
                }
                // Fetch from database if not in cache or skipCache is true
                const video = yield appwrite_1.databases.getDocument(appwrite_1.DATABASE_ID, appwrite_1.VIDEOS_COLLECTION_ID, id);
                const videoData = {
                    id: video.$id,
                    name: video.name,
                    fileSize: video.fileSize,
                    mimeType: video.mimeType,
                    duration: video.duration,
                    fileId: video.fileId,
                    status: video.status,
                    createdAt: new Date(video.$createdAt), // Use Appwrite's built-in system field
                    updatedAt: new Date(video.$updatedAt) // Use Appwrite's built-in system field
                };
                // Cache the video data for future requests
                yield redisService_1.default.cacheVideo(videoData);
                return videoData;
            }
            catch (error) {
                console.error('Error fetching video:', error);
                throw new errorHandler_1.AppError(`Video not found: ${error.message || 'Unknown error'}`, 404);
            }
        });
    }
    /**
     * List all videos
     * @param skipCache Whether to skip the cache and fetch directly from the database
     */
    listVideos() {
        return __awaiter(this, arguments, void 0, function* (skipCache = false) {
            try {
                // Use a consistent cache key for the video list
                // Check cache first if not skipping cache
                if (!skipCache) {
                    const videoListKey = 'video:list';
                    const cachedData = yield redisService_1.default.getCachedVideo(videoListKey);
                    if (cachedData && 'videos' in cachedData) {
                        console.log('Cache hit for video list');
                        return cachedData.videos;
                    }
                    console.log('Cache miss for video list');
                }
                // Fetch from database if not in cache or skipCache is true
                const response = yield appwrite_1.databases.listDocuments(appwrite_1.DATABASE_ID, appwrite_1.VIDEOS_COLLECTION_ID);
                const videos = response.documents.map(doc => ({
                    id: doc.$id,
                    name: doc.name,
                    fileSize: doc.fileSize,
                    mimeType: doc.mimeType,
                    duration: doc.duration,
                    fileId: doc.fileId,
                    status: doc.status,
                    createdAt: new Date(doc.$createdAt), // Use Appwrite's built-in system field
                    updatedAt: new Date(doc.$updatedAt) // Use Appwrite's built-in system field
                }));
                // Cache the video list for future requests
                const videoListKey = 'video:list';
                yield redisService_1.default.cacheVideo({ id: videoListKey, videos });
                return videos;
            }
            catch (error) {
                console.error('Error listing videos:', error);
                throw new errorHandler_1.AppError(`Failed to list videos: ${error.message || 'Unknown error'}`, 500);
            }
        });
    }
}
exports.VideoService = VideoService;
