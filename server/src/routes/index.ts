import { Router } from 'express';
import videoRoutes from './videoRoutes';
import subtitleRoutes from './subtitleRoutes';
import jobRoutes from './jobRoutes';
import redisMonitoringRoutes from './redisMonitoringRoutes';

const router = Router();

// Register all API routes
router.use('/videos', videoRoutes);
router.use('/subtitles', subtitleRoutes);
router.use('/jobs', jobRoutes);
router.use('/redis', redisMonitoringRoutes);

export default router;