import { Router } from 'express';
import videoRoutes from './videoRoutes';
import subtitleRoutes from './subtitleRoutes';

const router = Router();

// Register all API routes
router.use('/videos', videoRoutes);
router.use('/subtitles', subtitleRoutes);

export default router;