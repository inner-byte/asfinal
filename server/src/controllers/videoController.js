"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoController = void 0;
const videoService_1 = require("../services/videoService");
const errorHandler_1 = require("../middleware/errorHandler");
const fs = __importStar(require("fs"));
/**
 * Controller for handling video-related API requests
 */
class VideoController {
    constructor() {
        /**
         * Initialize a video upload
         */
        this.initializeUpload = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { fileName, fileSize, mimeType } = req.body;
                // Validate request body
                if (!fileName || !fileSize || !mimeType) {
                    throw new errorHandler_1.AppError('Missing required fields: fileName, fileSize, or mimeType', 400);
                }
                const video = yield this.videoService.initializeUpload(fileName, fileSize, mimeType);
                const response = {
                    status: 'success',
                    data: video,
                    message: 'Upload initialized successfully'
                };
                res.status(201).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        /**
         * Upload video file to Appwrite storage
         */
        this.uploadVideo = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                if (!id) {
                    throw new errorHandler_1.AppError('Video ID is required', 400);
                }
                if (!req.file) {
                    throw new errorHandler_1.AppError('No file uploaded', 400);
                }
                // Create a readable stream from the uploaded file
                const fileStream = fs.createReadStream(req.file.path);
                // Process the file upload
                const video = yield this.videoService.handleFileUpload(id, fileStream, req.file.originalname);
                // Clean up the temporary file after upload
                fs.unlinkSync(req.file.path);
                const response = {
                    status: 'success',
                    data: video,
                    message: 'Video uploaded successfully'
                };
                res.status(200).json(response);
            }
            catch (error) {
                // Clean up temporary file if it exists
                if (req.file && req.file.path) {
                    fs.unlinkSync(req.file.path);
                }
                next(error);
            }
        });
        /**
         * Stream video file
         */
        this.streamVideo = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                if (!id) {
                    throw new errorHandler_1.AppError('Video ID is required', 400);
                }
                // Get the video metadata to find the fileId
                const video = yield this.videoService.getVideoById(id);
                // Stream the video file
                const videoBuffer = yield this.videoService.streamVideo(video.fileId);
                // Set appropriate headers
                res.setHeader('Content-Type', video.mimeType);
                res.setHeader('Content-Length', videoBuffer.length);
                // Send the video file
                res.status(200).send(videoBuffer);
            }
            catch (error) {
                next(error);
            }
        });
        /**
         * Delete a video
         */
        this.deleteVideo = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                if (!id) {
                    throw new errorHandler_1.AppError('Video ID is required', 400);
                }
                yield this.videoService.deleteVideo(id);
                const response = {
                    status: 'success',
                    message: 'Video deleted successfully'
                };
                res.status(200).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        /**
         * Get a video by ID
         */
        this.getVideoById = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                if (!id) {
                    throw new errorHandler_1.AppError('Video ID is required', 400);
                }
                const video = yield this.videoService.getVideoById(id);
                const response = {
                    status: 'success',
                    data: video
                };
                res.status(200).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        /**
         * List all videos
         */
        this.listVideos = (_req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const videos = yield this.videoService.listVideos();
                const response = {
                    status: 'success',
                    data: videos,
                    message: `Found ${videos.length} videos`
                };
                res.status(200).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.videoService = new videoService_1.VideoService();
    }
}
exports.VideoController = VideoController;
