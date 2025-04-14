import { Router } from 'express';
// Import necessary controllers when they are created
// import { getSubtitles, generateSubtitles } from '../controllers/subtitleController';

const router = Router();

// Define subtitle routes here
// Example placeholder routes (replace with actual implementation later)
router.get('/:videoId', (req, res) => {
  res.status(501).json({ message: 'Get subtitles not implemented yet' });
});
router.post('/:videoId/generate', (req, res) => {
  res.status(501).json({ message: 'Generate subtitles not implemented yet' });
});
// router.get('/:videoId', getSubtitles);
// router.post('/:videoId/generate', generateSubtitles);

export default router;
