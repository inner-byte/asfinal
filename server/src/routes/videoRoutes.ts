import { Router } from 'express';
import { VideoController } from '../controllers/videoController';
import multer from 'multer';
import { AppError } from '../middleware/errorHandler';

// Configure multer for handling file uploads IN MEMORY
const storage = multer.memoryStorage(); // USE memoryStorage

// File filter to ensure only video files are uploaded
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new AppError('Only video files are allowed', 400) as unknown as Error);
  }
};

// Configure the upload middleware with 4GB limit
const upload = multer({
  storage, // Use memoryStorage
  fileFilter,
  limits: {
    fileSize: 4 * 1024 * 1024 * 1024 // 4GB limit
  }
});

const router = Router();
const videoController = new VideoController();

/**
 * @route   POST /api/videos
 * @desc    Initialize a video upload
 * @access  Public
 */
router.post('/', videoController.initializeUpload);

/**
 * @route   POST /api/videos/:id/upload
 * @desc    Upload a video file stream
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

export default router;