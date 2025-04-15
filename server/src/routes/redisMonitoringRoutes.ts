import { Router } from 'express';
import redisMonitoringController from '../controllers/redisMonitoringController';

const router = Router();

/**
 * @route GET /api/redis/status
 * @desc Get Redis status and memory usage information
 * @access Public
 */
router.get('/status', redisMonitoringController.getRedisStatus);

/**
 * @route GET /api/redis/keys
 * @desc Get Redis key statistics
 * @access Public
 */
router.get('/keys', redisMonitoringController.getKeyStats);

/**
 * @route GET /api/redis/file-hashes
 * @desc Get file hash statistics
 * @access Public
 */
router.get('/file-hashes', redisMonitoringController.getFileHashStats);

/**
 * @route POST /api/redis/cleanup
 * @desc Clean up expired file hashes
 * @access Public
 */
router.post('/cleanup', redisMonitoringController.cleanupFileHashes);

export default router;
