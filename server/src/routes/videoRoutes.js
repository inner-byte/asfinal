"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const videoController_1 = require("../controllers/videoController");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const errorHandler_1 = require("../middleware/errorHandler");
// Configure multer for handling file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path_1.default.join(__dirname, '../uploads');
        // Ensure the uploads directory exists
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
            console.log(`Created uploads directory at ${uploadsDir}`);
        }
        console.log(`Using uploads directory: ${uploadsDir}`);
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Use original name + timestamp to ensure unique filenames
        const uniqueName = `${Date.now()}-${file.originalname}`;
        console.log(`Generated filename: ${uniqueName}`);
        cb(null, uniqueName);
    }
});
// File filter to ensure only video files are uploaded
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
        cb(null, true);
    }
    else {
        cb(new errorHandler_1.AppError('Only video files are allowed', 400));
    }
};
// Configure the upload middleware with 4GB limit
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 4 * 1024 * 1024 * 1024 // 4GB limit
    }
});
const router = (0, express_1.Router)();
const videoController = new videoController_1.VideoController();
/**
 * @route   POST /api/videos
 * @desc    Initialize a video upload
 * @access  Public
 */
router.post('/', videoController.initializeUpload);
/**
 * @route   POST /api/videos/:id/upload
 * @desc    Upload a video file
 * @access  Public
 */
router.post('/:id/upload', upload.single('video'), videoController.uploadVideo);
/**
 * @route   GET /api/videos/:id/stream
 * @desc    Stream a video
 * @access  Public
 */
router.get('/:id/stream', videoController.streamVideo);
/**
 * @route   DELETE /api/videos/:id
 * @desc    Delete a video
 * @access  Public
 */
router.delete('/:id', videoController.deleteVideo);
/**
 * @route   GET /api/videos
 * @desc    Get all videos
 * @access  Public
 */
router.get('/', videoController.listVideos);
/**
 * @route   GET /api/videos/:id
 * @desc    Get a video by ID
 * @access  Public
 */
router.get('/:id', videoController.getVideoById);
exports.default = router;
