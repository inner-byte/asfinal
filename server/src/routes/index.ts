import { Router } from 'express';
import videoRoutes from './videoRoutes';
import subtitleRoutes from './subtitleRoutes';
import jobRoutes from './jobRoutes';

const router = Router();

// Register all API routes
router.use('/videos', videoRoutes);
router.use('/subtitles', subtitleRoutes);
router.use('/jobs', jobRoutes);

export default router;