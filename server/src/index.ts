import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import { errorHandler, AppError } from './middleware/errorHandler';
import { initializeAppwrite } from './config/appwriteInit';

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Express = express();
const port = process.env.PORT || 3001;

// Initialize Appwrite resources (async, will run in background)
(async () => {
  try {
    await initializeAppwrite();
  } catch (error) {
    console.error('Failed to initialize Appwrite resources:', error);
  }
})();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Root route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Welcome to the ABS Server API',
    endpoints: {
      health: '/health',
      api: '/api',
      videos: '/api/videos'
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

// Start server
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  console.log(`API endpoints available at http://localhost:${port}/api`);
  console.log(`Health check available at http://localhost:${port}/health`);
});

export default app;