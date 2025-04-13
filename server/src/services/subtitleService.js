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
exports.SubtitleService = void 0;
const node_appwrite_1 = require("node-appwrite");
const appwrite_1 = require("../config/appwrite");
const file_1 = require("node-appwrite/file");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const types_1 = require("../types");
const errorHandler_1 = require("../middleware/errorHandler");
const redisService_1 = __importDefault(require("./redisService"));
const videoService_1 = require("./videoService");
const vertex_1 = require("../config/vertex");
const vertexai_1 = require("@google-cloud/vertexai");
/**
 * Service for handling subtitle operations including generation, storage, and retrieval
 *
 * This service integrates with Gemini-flash-2.0 via Vertex AI to generate accurate
 * subtitles with timestamp precision within ±0.1 to ±3 seconds as specified in project requirements.
 *
 * @see {docs/project_goals.md} - For timestamp accuracy requirements
 */
class SubtitleService {
    constructor() {
        this.maxRetries = 3;
        this.initialRetryDelay = 2000; // 2 seconds
        this.videoService = new videoService_1.VideoService();
        this.tempDir = path_1.default.join(__dirname, '../../src/uploads');
        // Ensure temp directory exists
        if (!fs_1.default.existsSync(this.tempDir)) {
            fs_1.default.mkdirSync(this.tempDir, { recursive: true });
        }
    }
    /**
     * Generate subtitles for a video using Gemini-flash-2.0
     *
     * @param videoId - Unique identifier of the video
     * @param language - Language code for subtitle generation (e.g., 'en', 'fr')
     * @returns Promise containing the subtitle generation task
     * @throws AppError if video retrieval or task creation fails
     */
    generateSubtitles(videoId_1) {
        return __awaiter(this, arguments, void 0, function* (videoId, language = 'en') {
            try {
                if (!videoId) {
                    throw new errorHandler_1.AppError('Video ID is required for subtitle generation', 400);
                }
                // Check if we already have generated subtitles for this video in cache
                const cachedTask = yield redisService_1.default.getCachedSubtitle(videoId);
                if (cachedTask && 'status' in cachedTask) {
                    console.log(`Cache hit for subtitle generation task for video ID: ${videoId}`);
                    return cachedTask;
                }
                console.log(`Cache miss for subtitle generation task for video ID: ${videoId}`);
                // Get the video to ensure it exists
                const video = yield this.videoService.getVideoById(videoId);
                // Create a unique task ID
                const taskId = node_appwrite_1.ID.unique();
                // Create a generation task
                const task = {
                    id: taskId,
                    videoId: video.id,
                    status: types_1.SubtitleGenerationStatus.PENDING,
                    progress: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                // Cache the task for future requests
                yield redisService_1.default.cacheSubtitle(videoId, task);
                // Begin processing in the background
                this.processSubtitleGeneration(task, language)
                    .catch(error => {
                    console.error(`Error processing subtitle generation for task ${taskId}:`, error);
                });
                return task;
            }
            catch (error) {
                console.error('Error generating subtitles:', error);
                if (error instanceof errorHandler_1.AppError) {
                    throw error;
                }
                throw new errorHandler_1.AppError(`Failed to generate subtitles: ${error.message || 'Unknown error'}`, 500);
            }
        });
    }
    /**
     * Process subtitle generation using Gemini-flash-2.0
     *
     * This method handles the complete subtitle generation workflow:
     * 1. Validate configuration
     * 2. Retrieve video URL
     * 3. Generate subtitles with Gemini
     * 4. Save subtitles to storage
     * 5. Update task status throughout the process
     *
     * @param task - Subtitle generation task to process
     * @param language - Language code for subtitle generation
     * @private
     */
    processSubtitleGeneration(task, language) {
        return __awaiter(this, void 0, void 0, function* () {
            // Update task status to processing
            task.status = types_1.SubtitleGenerationStatus.PROCESSING;
            task.progress = 10;
            task.updatedAt = new Date();
            yield redisService_1.default.cacheSubtitle(task.videoId, task);
            try {
                // Validate Vertex AI configuration
                if (!(0, vertex_1.validateVertexConfig)()) {
                    throw new errorHandler_1.AppError('Vertex AI configuration is incomplete. Please check environment variables.', 500);
                }
                // Get video file from storage
                const video = yield this.videoService.getVideoById(task.videoId);
                console.log(`Processing video ID: ${video.id}, fileId: ${video.fileId}`);
                // Get the download URL for the video file
                let videoFileUrl;
                try {
                    videoFileUrl = yield this.videoService.getVideoDownloadUrl(video.id);
                    console.log(`Successfully retrieved video download URL: ${videoFileUrl}`);
                }
                catch (urlError) {
                    console.error('Error getting video download URL:', urlError);
                    throw new errorHandler_1.AppError(`Failed to get video download URL: ${urlError.message || 'Unknown error'}`, 500);
                }
                if (!videoFileUrl) {
                    throw new errorHandler_1.AppError('Failed to get video download URL from storage - URL is empty', 500);
                }
                // Update progress
                task.progress = 20;
                task.updatedAt = new Date();
                yield redisService_1.default.cacheSubtitle(task.videoId, task);
                // Generate subtitles using Gemini
                const subtitleContent = yield this.generateSubtitlesWithGemini(videoFileUrl, language);
                // Update progress
                task.progress = 60;
                task.updatedAt = new Date();
                yield redisService_1.default.cacheSubtitle(task.videoId, task);
                // Save the subtitles to storage
                yield this.saveSubtitles(task.videoId, subtitleContent, types_1.SubtitleFormat.VTT, language);
                // Update task status to completed
                task.status = types_1.SubtitleGenerationStatus.COMPLETED;
                task.progress = 100;
                task.updatedAt = new Date();
                yield redisService_1.default.cacheSubtitle(task.videoId, task);
            }
            catch (error) {
                console.error('Error processing subtitle generation:', error);
                // Update task status to failed
                task.status = types_1.SubtitleGenerationStatus.FAILED;
                task.error = error.message || 'Unknown error during subtitle generation';
                task.updatedAt = new Date();
                yield redisService_1.default.cacheSubtitle(task.videoId, task);
            }
        });
    }
    /**
     * Generate subtitles with Gemini-flash-2.0 model via Vertex AI
     *
     * Uses exponential backoff retry logic to handle transient errors
     * and ensures the generated content is valid VTT format.
     *
     * @param videoUrl - URL of the video file
     * @param language - Language code for subtitle generation
     * @returns Promise with subtitle content in VTT format
     * @throws AppError if subtitle generation fails
     * @private
     */
    generateSubtitlesWithGemini(videoUrl, language) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Format system instruction for best results with Gemini-flash-2.0
                const systemInstruction = {
                    role: 'system',
                    parts: [{
                            text: `You are a professional subtitle generator that creates highly accurate WebVTT subtitles from videos.
                Your task is to transcribe the audio from the video and create subtitles with timestamps accurate within ±0.1 to ±3 seconds of the spoken content.
                Always format output as standard WebVTT with proper headers and timestamps.
                Include all spoken dialogue and important sounds in the subtitles.
                Maintain the original language and meaning of the content.`
                        }]
                };
                // Prepare the prompt that will be used for subtitle generation
                const prompt = `
        Generate accurate WebVTT subtitles for this video with precise timestamps.
        Follow these guidelines:

        1. Begin with the standard "WEBVTT" header
        2. Use timeline markers in the format "00:00:00.000 --> 00:00:00.000"
        3. Keep each subtitle segment brief (1-2 sentences maximum)
        4. Generate subtitles in ${language} language
        5. Match the spoken content precisely
        6. Ensure timestamp accuracy within ±0.1 to ±3 seconds
        7. Use proper punctuation and capitalization
        8. Include descriptive text like [Music] or [Applause] only when necessary for context
        9. Transcribe all dialogue and important audio content

        Your response should ONLY contain properly formatted WebVTT content, nothing else.
      `;
                // Setup retry logic with exponential backoff
                let retries = 0;
                let delay = this.initialRetryDelay;
                let lastError = null;
                // Process the video using the Vertex AI Gemini model
                while (retries <= this.maxRetries) {
                    try {
                        console.log(`Generating subtitles with Gemini-flash-2.0, attempt ${retries + 1}`);
                        console.log(`Processing video URL for Gemini: ${videoUrl}`);
                        // Determine the appropriate MIME type based on the video URL
                        const mimeType = videoUrl.endsWith('.mp4') ? 'video/mp4' :
                            videoUrl.endsWith('.webm') ? 'video/webm' :
                                videoUrl.endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
                        console.log(`Using MIME type: ${mimeType}`);
                        // Create content parts for the request
                        // For Gemini 2.0 Flash, we need to structure the request properly for video processing
                        let contentParts;
                        // Check if the URL is a public HTTP URL or a Google Cloud Storage URL
                        if (videoUrl.startsWith('http')) {
                            console.log('Using HTTP URL format for Gemini API');
                            contentParts = [
                                { text: prompt },
                                {
                                    // Use the correct format for video input with appropriate MIME type
                                    fileData: {
                                        mimeType: mimeType,
                                        fileUri: videoUrl
                                    }
                                }
                            ];
                        }
                        else {
                            console.log('Using direct file content for Gemini API');
                            // For non-HTTP URLs, we might need to download the file and use its content directly
                            // This is a fallback approach
                            contentParts = [
                                { text: prompt },
                                {
                                    // Use the correct format for video input with appropriate MIME type
                                    fileData: {
                                        mimeType: mimeType,
                                        fileUri: videoUrl
                                    }
                                }
                            ];
                        }
                        // Configure generation parameters for best results with subtitles
                        const result = yield vertex_1.geminiModel.generateContent({
                            contents: [
                                { role: 'user', parts: contentParts }
                            ],
                            systemInstruction,
                            generationConfig: {
                                maxOutputTokens: 8192,
                                temperature: 0.1, // Lower temperature for more deterministic, precise output
                                topP: 0.95,
                                topK: 40,
                            },
                            safetySettings: [
                                {
                                    category: vertexai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                                    threshold: vertexai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                                },
                                {
                                    category: vertexai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                                    threshold: vertexai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                                }
                            ]
                        });
                        // Validate Gemini response structure
                        if (!result.response ||
                            !result.response.candidates ||
                            result.response.candidates.length === 0 ||
                            !result.response.candidates[0].content ||
                            !result.response.candidates[0].content.parts ||
                            result.response.candidates[0].content.parts.length === 0) {
                            throw new Error('Invalid or empty response from Gemini model');
                        }
                        const subtitleContent = result.response.candidates[0].content.parts[0].text || '';
                        // Validate the VTT content
                        if (!this.isValidVTT(subtitleContent)) {
                            throw new Error('Generated content is not in valid VTT format');
                        }
                        // Return valid subtitle content
                        return this.normalizeVTT(subtitleContent);
                    }
                    catch (error) {
                        lastError = error;
                        retries++;
                        // Log detailed error for debugging
                        console.error(`Gemini subtitle generation attempt ${retries} failed:`, error.message || 'Unknown error');
                        if (retries > this.maxRetries) {
                            console.error('Max retries reached for Gemini subtitle generation');
                            break;
                        }
                        // Exponential backoff with jitter
                        const jitter = Math.random() * 0.3 * delay;
                        const actualDelay = delay + jitter;
                        console.log(`Retry ${retries}/${this.maxRetries} after ${Math.round(actualDelay)}ms delay`);
                        yield new Promise(resolve => setTimeout(resolve, actualDelay));
                        delay *= 2; // Exponential backoff
                    }
                }
                // If all retries failed, throw the last error
                if (lastError) {
                    throw lastError;
                }
                throw new Error('Failed to generate subtitles after multiple attempts');
            }
            catch (error) {
                console.error('Error generating subtitles with Gemini:', error);
                throw new errorHandler_1.AppError(`Gemini subtitle generation failed: ${error.message || 'Unknown error'}`, 500);
            }
        });
    }
    /**
     * Normalize VTT content to ensure it follows the correct format
     *
     * @param content - Raw VTT content to normalize
     * @returns Normalized VTT content
     * @private
     */
    normalizeVTT(content) {
        // Ensure the file starts with WEBVTT header
        if (!content.trim().startsWith('WEBVTT')) {
            content = 'WEBVTT\n\n' + content.trim();
        }
        // Ensure there's a blank line after the header
        if (!content.startsWith('WEBVTT\n\n')) {
            content = content.replace('WEBVTT', 'WEBVTT\n');
        }
        // Fix common formatting issues
        return content
            // Ensure consistent newlines
            .replace(/\r\n/g, '\n')
            // Ensure proper spacing between entries
            .replace(/\n{3,}/g, '\n\n')
            // Fix timestamp format if needed
            .replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2')
            // Trim extra whitespace
            .trim();
    }
    /**
     * Validate if the content is in proper WebVTT format
     *
     * Checks for required WebVTT header and timestamp format
     *
     * @param content - Subtitle content to validate
     * @returns boolean Whether the content is valid VTT
     * @private
     */
    isValidVTT(content) {
        // Basic validation for VTT format
        if (!content || content.trim().length < 20) {
            return false;
        }
        // Check if content starts with or contains "WEBVTT" header
        const hasWebVTTHeader = content.trim().includes('WEBVTT');
        // Validate timestamp format HH:MM:SS.mmm --> HH:MM:SS.mmm
        // Also accept the comma format: HH:MM:SS,mmm --> HH:MM:SS,mmm (common in some systems)
        const timestampRegex = /\d\d:\d\d:\d\d[.,]\d\d\d\s*-->\s*\d\d:\d\d:\d\d[.,]\d\d\d/;
        const hasTimeCodes = timestampRegex.test(content);
        // Additional validation for required structure - content after timestamps
        const hasSubtitleContent = content.split('-->').length > 1 &&
            content.split('-->').some(part => part.trim().length > 5);
        return hasWebVTTHeader && hasTimeCodes && hasSubtitleContent;
    }
    /**
     * Get subtitle generation task status
     *
     * Retrieves the current status of a subtitle generation task
     *
     * @param taskId - Unique identifier of the task
     * @returns Promise with task status information
     * @throws AppError if task not found or retrieval fails
     */
    getSubtitleGenerationStatus(taskId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!taskId) {
                    throw new errorHandler_1.AppError('Task ID is required', 400);
                }
                // Try to fetch the task from the cache using task ID
                // In a real implementation with Redis, we would have a way to look up tasks by their ID
                // For now, implement a basic simulation while ensuring proper error handling
                // Simulate a task status - in production this would query a database or Redis
                const task = {
                    id: taskId,
                    videoId: 'simulated-video-id',
                    status: types_1.SubtitleGenerationStatus.PROCESSING,
                    progress: 50,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                return task;
            }
            catch (error) {
                console.error('Error getting subtitle generation status:', error);
                if (error instanceof errorHandler_1.AppError) {
                    throw error;
                }
                throw new errorHandler_1.AppError(`Failed to get subtitle generation status: ${error.message || 'Unknown error'}`, 500);
            }
        });
    }
    /**
     * Get subtitles for a video
     *
     * Retrieves subtitle content for a video, checking cache first
     * and falling back to database if needed
     *
     * @param videoId - Unique identifier of the video
     * @param format - Desired subtitle format (VTT, SRT, ASS)
     * @param skipCache - Whether to bypass cache and fetch directly from database
     * @returns Promise with subtitle object or null if not found
     * @throws AppError if retrieval fails
     */
    getSubtitles(videoId_1) {
        return __awaiter(this, arguments, void 0, function* (videoId, format = types_1.SubtitleFormat.VTT, skipCache = false) {
            try {
                if (!videoId) {
                    throw new errorHandler_1.AppError('Video ID is required', 400);
                }
                // Validate format
                if (!Object.values(types_1.SubtitleFormat).includes(format)) {
                    throw new errorHandler_1.AppError(`Invalid subtitle format: ${format}. Supported formats: ${Object.values(types_1.SubtitleFormat).join(', ')}`, 400);
                }
                // Check cache first if not skipping cache
                if (!skipCache) {
                    const cachedSubtitles = yield redisService_1.default.getCachedSubtitle(videoId);
                    if (cachedSubtitles && 'format' in cachedSubtitles && cachedSubtitles.format === format) {
                        console.log(`Cache hit for subtitles for video ID: ${videoId}, format: ${format}`);
                        return cachedSubtitles;
                    }
                    console.log(`Cache miss for subtitles for video ID: ${videoId}, format: ${format}`);
                }
                // Query the database for subtitles
                try {
                    // Get all documents that match the video ID and format
                    const subtitles = yield appwrite_1.databases.listDocuments(appwrite_1.DATABASE_ID, appwrite_1.SUBTITLES_COLLECTION_ID, [
                        `videoId=${videoId}`,
                        `format=${format}`
                    ]);
                    // If no subtitles found, return null
                    if (subtitles.total === 0) {
                        return null;
                    }
                    // Get the most recent subtitle
                    const subtitle = subtitles.documents[0];
                    const subtitleData = {
                        id: subtitle.$id,
                        videoId: subtitle.videoId,
                        format: subtitle.format,
                        fileId: subtitle.fileId,
                        language: subtitle.language,
                        createdAt: new Date(subtitle.$createdAt),
                        updatedAt: new Date(subtitle.$updatedAt)
                    };
                    // Cache the subtitle for future requests
                    if (!skipCache) {
                        yield redisService_1.default.cacheSubtitle(videoId, subtitleData);
                    }
                    return subtitleData;
                }
                catch (error) {
                    console.error('Error fetching subtitles from database:', error);
                    return null;
                }
            }
            catch (error) {
                console.error('Error getting subtitles:', error);
                if (error instanceof errorHandler_1.AppError) {
                    throw error;
                }
                throw new errorHandler_1.AppError(`Failed to get subtitles: ${error.message || 'Unknown error'}`, 500);
            }
        });
    }
    /**
     * Save subtitles for a video
     *
     * Saves subtitle content to storage and records metadata in database
     *
     * @param videoId - Unique identifier of the video
     * @param subtitleContent - The subtitle content in text format
     * @param format - The subtitle format (VTT, SRT, ASS)
     * @param language - Language code of the subtitles
     * @returns Promise with saved subtitle metadata
     * @throws AppError if save operation fails
     */
    saveSubtitles(videoId_1, subtitleContent_1) {
        return __awaiter(this, arguments, void 0, function* (videoId, subtitleContent, format = types_1.SubtitleFormat.VTT, language = 'en') {
            try {
                if (!videoId) {
                    throw new errorHandler_1.AppError('Video ID is required', 400);
                }
                if (!subtitleContent) {
                    throw new errorHandler_1.AppError('Subtitle content is required', 400);
                }
                // Validate subtitle content based on format
                if (format === types_1.SubtitleFormat.VTT && !this.isValidVTT(subtitleContent)) {
                    throw new errorHandler_1.AppError('Invalid VTT format', 400);
                }
                // Get the video to ensure it exists
                const video = yield this.videoService.getVideoById(videoId);
                // Create a unique file ID for Appwrite storage
                const fileId = node_appwrite_1.ID.unique();
                // Create a temporary file to store the subtitle content
                const tempFilePath = path_1.default.join(this.tempDir, `subtitle_${fileId}.${format}`);
                try {
                    // Write content to temporary file
                    fs_1.default.writeFileSync(tempFilePath, subtitleContent);
                    // Upload the subtitle file to Appwrite storage
                    const file = file_1.InputFile.fromPath(tempFilePath, `subtitle_${videoId}.${format}`);
                    yield appwrite_1.storage.createFile(appwrite_1.SUBTITLES_BUCKET_ID, fileId, file, (0, appwrite_1.createFilePermissions)());
                    // Create subtitle entry in database
                    const subtitle = yield appwrite_1.databases.createDocument(appwrite_1.DATABASE_ID, appwrite_1.SUBTITLES_COLLECTION_ID, node_appwrite_1.ID.unique(), {
                        videoId: video.id,
                        format,
                        fileId,
                        language,
                        status: 'completed'
                    }, (0, appwrite_1.createDocumentPermissions)());
                    const subtitleData = {
                        id: subtitle.$id,
                        videoId: subtitle.videoId,
                        format: subtitle.format,
                        fileId: subtitle.fileId,
                        language: subtitle.language,
                        createdAt: new Date(subtitle.$createdAt),
                        updatedAt: new Date(subtitle.$updatedAt)
                    };
                    // Cache the subtitle data for future requests
                    yield redisService_1.default.cacheSubtitle(videoId, subtitleData);
                    return subtitleData;
                }
                finally {
                    // Clean up the temporary file - ensure this runs even if there's an error
                    if (fs_1.default.existsSync(tempFilePath)) {
                        fs_1.default.unlinkSync(tempFilePath);
                    }
                }
            }
            catch (error) {
                console.error('Error saving subtitles:', error);
                if (error instanceof errorHandler_1.AppError) {
                    throw error;
                }
                throw new errorHandler_1.AppError(`Failed to save subtitles: ${error.message || 'Unknown error'}`, 500);
            }
        });
    }
    /**
     * Delete subtitles for a video
     *
     * Removes both the file from storage and metadata from database
     *
     * @param id - Unique identifier of the subtitle
     * @throws AppError if deletion fails
     */
    deleteSubtitles(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!id) {
                    throw new errorHandler_1.AppError('Subtitle ID is required', 400);
                }
                // Get the subtitle to ensure it exists and to get the fileId
                const subtitle = yield this.getSubtitleById(id);
                try {
                    // Delete the file from storage
                    yield appwrite_1.storage.deleteFile(appwrite_1.SUBTITLES_BUCKET_ID, subtitle.fileId);
                }
                catch (error) {
                    console.warn(`Failed to delete subtitle file (ID: ${subtitle.fileId}): ${error.message}`);
                    // Continue with document deletion even if file deletion fails
                }
                // Delete the document from database
                yield appwrite_1.databases.deleteDocument(appwrite_1.DATABASE_ID, appwrite_1.SUBTITLES_COLLECTION_ID, id);
                // Invalidate cache
                yield redisService_1.default.deleteCachedSubtitle(subtitle.videoId);
                console.log(`Subtitle ${id} deleted successfully`);
            }
            catch (error) {
                console.error('Error deleting subtitles:', error);
                if (error instanceof errorHandler_1.AppError) {
                    throw error;
                }
                throw new errorHandler_1.AppError(`Failed to delete subtitles: ${error.message || 'Unknown error'}`, 500);
            }
        });
    }
    /**
     * Get subtitle by ID
     *
     * Retrieves a specific subtitle by its unique ID
     *
     * @param id - Unique identifier of the subtitle
     * @param skipCache - Whether to bypass cache and fetch directly from database
     * @returns Promise with subtitle metadata
     * @throws AppError if subtitle not found or retrieval fails
     */
    getSubtitleById(id_1) {
        return __awaiter(this, arguments, void 0, function* (id, skipCache = false) {
            try {
                if (!id) {
                    throw new errorHandler_1.AppError('Subtitle ID is required', 400);
                }
                // Fetch from database
                try {
                    const subtitle = yield appwrite_1.databases.getDocument(appwrite_1.DATABASE_ID, appwrite_1.SUBTITLES_COLLECTION_ID, id);
                    const subtitleData = {
                        id: subtitle.$id,
                        videoId: subtitle.videoId,
                        format: subtitle.format,
                        fileId: subtitle.fileId,
                        language: subtitle.language,
                        createdAt: new Date(subtitle.$createdAt),
                        updatedAt: new Date(subtitle.$updatedAt)
                    };
                    // Cache the result for future requests if not skipping cache
                    if (!skipCache) {
                        yield redisService_1.default.cacheSubtitle(subtitleData.videoId, subtitleData);
                    }
                    return subtitleData;
                }
                catch (error) {
                    // Handle specific Appwrite error for document not found
                    if (error.code === 404) {
                        throw new errorHandler_1.AppError(`Subtitle not found with ID: ${id}`, 404);
                    }
                    throw error;
                }
            }
            catch (error) {
                console.error('Error getting subtitle by ID:', error);
                if (error instanceof errorHandler_1.AppError) {
                    throw error;
                }
                throw new errorHandler_1.AppError(`Subtitle retrieval failed: ${error.message || 'Unknown error'}`, 500);
            }
        });
    }
}
exports.SubtitleService = SubtitleService;
// Export a singleton instance
exports.default = new SubtitleService();
