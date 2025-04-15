import { Router } from 'express';
import {
  generateSubtitles,
  getSubtitlesByVideoId,
  getSubtitleById,
  getSubtitleContent,
  deleteSubtitle,
  getJobStatus
} from '../controllers/subtitleController';

const router = Router();

// GET subtitles for a specific video
router.get('/video/:videoId', getSubtitlesByVideoId);

// Generate subtitles for a video
router.post('/video/:videoId/generate', generateSubtitles);

// Get specific subtitle by ID
router.get('/:id', getSubtitleById);

// Get subtitle content by file ID
router.get('/content/:fileId', getSubtitleContent);

// Delete a subtitle
router.delete('/:id', deleteSubtitle);

export default router;
