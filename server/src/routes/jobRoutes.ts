import { Router } from 'express';
import { getJobStatus } from '../controllers/subtitleController';

const router = Router();

// Get job status
router.get('/:jobId/status', getJobStatus);

export default router;
