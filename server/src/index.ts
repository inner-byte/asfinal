import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { initializeAppwrite } from './config/appwriteInit';
import { redisClient } from './config/redis';

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
app.get('/health', (_req: Request, res: Response) => {
  // Check Redis status
  const redisStatus = redisClient.status === 'ready' ? 'connected' : 'disconnected';

  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    services: {
      redis: redisStatus
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
      subtitles: '/api/subtitles'
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
    console.log('Initializing Appwrite resources...');
    await initializeAppwrite();
    console.log('Appwrite resources initialized successfully');

    // Start server after Appwrite initialization
    app.listen(port, () => {
      console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
      console.log(`API endpoints available at http://localhost:${port}/api`);
      console.log(`Health check available at http://localhost:${port}/health`);
    });
  } catch (error) {
    console.error('Failed to initialize Appwrite resources:', error);

    // Start server anyway, but log the error
    // This allows the server to start even if Appwrite initialization fails
    // The server will still be able to handle requests that don't require Appwrite
    console.warn('Starting server despite Appwrite initialization failure');
    app.listen(port, () => {
      console.log(`⚡️[server]: Server is running at http://localhost:${port} (LIMITED FUNCTIONALITY)`);
      console.log(`API endpoints available at http://localhost:${port}/api`);
      console.log(`Health check available at http://localhost:${port}/health`);
    });
  }
})();

export default app;