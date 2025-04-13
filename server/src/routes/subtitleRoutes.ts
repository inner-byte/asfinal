import { Router } from 'express';
import { SubtitleController } from '../controllers/subtitleController';

const router = Router();
const subtitleController = new SubtitleController();

/**
 * @route   POST /api/subtitles/generate/:videoId
 * @desc    Generate subtitles for a video
 * @access  Public
 */
router.post('/generate/:videoId', subtitleController.generateSubtitles);

/**
 * @route   GET /api/subtitles/status/:taskId
 * @desc    Get subtitle generation task status
 * @access  Public
 */
router.get('/status/:taskId', subtitleController.getGenerationStatus);

/**
 * @route   GET /api/subtitles/:videoId
 * @desc    Get subtitles for a video
 * @access  Public
 */
router.get('/:videoId', subtitleController.getSubtitles);

/**
 * @route   POST /api/subtitles/:videoId
 * @desc    Save subtitles for a video
 * @access  Public
 */
router.post('/:videoId', subtitleController.saveSubtitles);

/**
 * @route   DELETE /api/subtitles/:id
 * @desc    Delete subtitles
 * @access  Public
 */
router.delete('/:id', subtitleController.deleteSubtitles);

export default router;
