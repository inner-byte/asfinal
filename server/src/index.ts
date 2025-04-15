import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { initializeAppwrite } from './config/appwriteInit';
import { redisClient } from './config/redis';
import redisMonitoringService from './services/redisMonitoringService';
import backgroundJobService from './services/backgroundJobService';

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Express = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route with service status
app.get('/health', async (_req: Request, res: Response) => {
  // Check Redis status
  const redisStatus = redisClient.status === 'ready' ? 'connected' : 'disconnected';

  // Get Redis memory info if connected
  let redisMemoryInfo = null;
  let fileHashStats = null;

  if (redisStatus === 'connected') {
    try {
      redisMemoryInfo = await redisMonitoringService.getMemoryInfo();
      fileHashStats = await redisMonitoringService.getFileHashStats();
    } catch (error) {
      console.error('Error getting Redis info for health check:', error);
    }
  }

  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    services: {
      redis: {
        status: redisStatus,
        memory: redisMemoryInfo ? {
          usedMemoryHuman: redisMemoryInfo.usedMemoryHuman,
          memoryUsagePercentage: redisMemoryInfo.memoryUsagePercentage.toFixed(2) + '%',
          maxmemoryHuman: redisMemoryInfo.maxmemoryHuman,
          maxmemoryPolicy: redisMemoryInfo.maxmemoryPolicy
        } : null,
        fileHashes: fileHashStats ? {
          totalHashes: fileHashStats.totalHashes,
          hashesWithSubtitles: fileHashStats.hashesWithSubtitles,
          hashesWithoutSubtitles: fileHashStats.hashesWithoutSubtitles
        } : null
      }
    },
    monitoringEndpoints: {
      redisStatus: '/api/redis/status',
      redisKeys: '/api/redis/keys',
      redisFileHashes: '/api/redis/file-hashes',
      redisCleanup: '/api/redis/cleanup'
    }
  });
});

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Welcome to the ABS Server API',
    endpoints: {
      health: '/health',
      api: '/api',
      videos: '/api/videos',
      subtitles: '/api/subtitles',
      jobs: '/api/jobs'
    }
  });
});

// API Routes
app.use('/api', routes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler - properly typed as Express error handler middleware
app.use(errorHandler);

// Initialize Appwrite resources and start server
(async () => {
  try {
    // Check Redis connection status
    console.log('Checking Redis connection status...');
    if (redisClient.status === 'ready') {
      console.log('Redis is connected and ready');
    } else {
      console.warn('Redis is not ready - caching functionality may be limited');
    }

    console.log('Initializing Appwrite resources...');
    await initializeAppwrite();
    console.log('Appwrite resources initialized successfully');

    // Start server after Appwrite initialization
    const server = app.listen(port, () => {
      console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
      console.log(`API endpoints available at http://localhost:${port}/api`);
      console.log(`Health check available at http://localhost:${port}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received: closing HTTP server and background jobs');

      // Shutdown background job service
      await backgroundJobService.shutdown();

      // Close HTTP server
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT signal received: closing HTTP server and background jobs');

      // Shutdown background job service
      await backgroundJobService.shutdown();

      // Close HTTP server
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to initialize Appwrite resources:', error);

    // Start server anyway, but log the error
    // This allows the server to start even if Appwrite initialization fails
    // The server will still be able to handle requests that don't require Appwrite
    console.warn('Starting server despite Appwrite initialization failure');
    const server = app.listen(port, () => {
      console.log(`⚡️[server]: Server is running at http://localhost:${port} (LIMITED FUNCTIONALITY)`);
      console.log(`API endpoints available at http://localhost:${port}/api`);
      console.log(`Health check available at http://localhost:${port}/health`);
    });

    // Graceful shutdown even in limited functionality mode
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received: closing HTTP server and background jobs');

      // Shutdown background job service
      await backgroundJobService.shutdown();

      // Close HTTP server
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT signal received: closing HTTP server and background jobs');

      // Shutdown background job service
      await backgroundJobService.shutdown();

      // Close HTTP server
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
  }
})();

export default app;