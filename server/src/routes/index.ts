import { Router } from 'express';
import videoRoutes from './videoRoutes';

const router = Router();

// Register all API routes
router.use('/videos', videoRoutes);

export default router;