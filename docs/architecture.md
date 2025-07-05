# Architecture Document
## AI-Powered Subtitle Generator Web Application

### 1. Architecture Overview

The AI-Powered Subtitle Generator follows a modern, scalable architecture pattern with clear separation of concerns between the frontend and backend components. The system is designed as a distributed application with the following key characteristics:

- **Frontend**: Next.js with TypeScript (Client-side rendering and SSR)
- **Backend**: Node.js with Express (RESTful API server)
- **Database**: Appwrite (NoSQL database and file storage)
- **Queue System**: Redis with BullMQ (Background job processing)
- **AI Processing**: Google Vertex AI (Gemini-flash-2.0 model)

### 2. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                          Next.js Frontend                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   Video Upload  │  │ Subtitle Preview │  │ Export Manager  │              │
│  │   Component     │  │    Component     │  │   Component     │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                │                                             │
│                        ┌───────▼────────┐                                   │
│                        │  Plyr Player   │                                   │
│                        │  (VTT Support) │                                   │
│                        └────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTP/REST API
                                 │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                              API Layer                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                        Node.js + Express Server                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │     Video       │  │    Subtitle     │  │      Job        │              │
│  │   Controller    │  │   Controller    │  │   Controller    │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│           │                     │                     │                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │     Video       │  │    Subtitle     │  │  Background     │              │
│  │    Service      │  │    Service      │  │  Job Service    │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                           Service Layer                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   Appwrite      │  │     Redis       │  │   Vertex AI     │              │
│  │   Database      │  │   Queue/Cache   │  │   (Gemini)      │              │
│  │   & Storage     │  │                 │  │                 │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │    FFmpeg       │  │    File System  │  │   Monitoring    │              │
│  │   Processing    │  │    (Temporary)  │  │    & Logging    │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3. Backend Architecture (Node.js + Express)

#### 3.1 Directory Structure

```
server/
├── src/
│   ├── controllers/          # HTTP request handlers
│   │   ├── videoController.ts
│   │   ├── subtitleController.ts
│   │   ├── jobController.ts
│   │   └── healthController.ts
│   ├── services/             # Business logic layer
│   │   ├── videoService.ts
│   │   ├── subtitleService.ts
│   │   ├── backgroundJobService.ts
│   │   ├── appwriteService.ts
│   │   └── redisService.ts
│   ├── routes/               # API route definitions
│   │   ├── index.ts
│   │   ├── video.ts
│   │   ├── subtitle.ts
│   │   └── job.ts
│   ├── middleware/           # Express middleware
│   │   ├── errorHandler.ts
│   │   ├── validation.ts
│   │   ├── auth.ts
│   │   └── rateLimit.ts
│   ├── utils/                # Utility functions
│   │   ├── geminiUtils.ts
│   │   ├── gcsUtils.ts
│   │   ├── appwriteUtils.ts
│   │   └── videoUtils.ts
│   ├── config/               # Configuration files
│   │   ├── appwrite.ts
│   │   ├── redis.ts
│   │   └── vertex.ts
│   ├── types/                # TypeScript definitions
│   │   ├── index.ts
│   │   ├── video.ts
│   │   └── subtitle.ts
│   └── index.ts              # Application entry point
├── package.json
├── tsconfig.json
├── .env.example
└── Dockerfile
```

#### 3.2 Core Components

##### Express Application Setup
```typescript
// src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);
```

##### Controller Layer
```typescript
// src/controllers/videoController.ts
export class VideoController {
  async uploadVideo(req: Request, res: Response): Promise<void> {
    // Handle video upload with streaming
    // Validate file type and size
    // Store in Appwrite bucket
    // Return video metadata
  }

  async getVideo(req: Request, res: Response): Promise<void> {
    // Retrieve video metadata
    // Stream video content
  }

  async deleteVideo(req: Request, res: Response): Promise<void> {
    // Delete video from storage
    // Clean up associated subtitles
  }
}
```

##### Service Layer
```typescript
// src/services/videoService.ts
export class VideoService {
  async processVideoUpload(file: Express.Multer.File): Promise<VideoMetadata> {
    // Validate video format
    // Extract metadata using FFmpeg
    // Store in Appwrite
    // Return processed metadata
  }

  async streamVideo(videoId: string): Promise<ReadableStream> {
    // Create streaming response from Appwrite
    // Handle range requests
    // Optimize for large files
  }
}
```

#### 3.3 Background Job Processing

##### BullMQ Integration
```typescript
// src/services/backgroundJobService.ts
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

export class BackgroundJobService {
  private subtitleQueue: Queue;
  private subtitleWorker: Worker;

  constructor() {
    const connection = new IORedis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379')
    });

    this.subtitleQueue = new Queue('subtitle-generation', { connection });
    this.subtitleWorker = new Worker('subtitle-generation', 
      this.processSubtitleJob.bind(this), { connection });
  }

  async addSubtitleJob(videoId: string, options: SubtitleOptions): Promise<Job> {
    return this.subtitleQueue.add('generate-subtitles', {
      videoId,
      options
    });
  }

  private async processSubtitleJob(job: Job): Promise<SubtitleResult> {
    // Process subtitle generation
    // Update job progress
    // Handle errors and retries
  }
}
```

### 4. Data Flow Architecture

#### 4.1 Video Upload Flow

```
User Upload → Express Multer → Validation → Appwrite Storage → Database Record
     ↓
Progress Updates → WebSocket/SSE → Frontend Progress Bar
     ↓
Metadata Extraction → FFmpeg → Video Duration/Format → Database Update
```

#### 4.2 Subtitle Generation Flow

```
User Request → Job Queue (Redis) → Background Worker → Vertex AI API
     ↓
Gemini Processing → VTT Generation → Appwrite Storage → Database Update
     ↓
Job Status Updates → Frontend Polling → UI Update
```

#### 4.3 Real-time Preview Flow

```
Video Load → Plyr Player → VTT Subtitle Load → Cue Change Events
     ↓
Timestamp Sync → Dynamic Adjustment → UI Update
```

### 5. API Design

#### 5.1 RESTful API Endpoints

```typescript
// Video Management
POST   /api/videos/upload           # Upload video file
GET    /api/videos/:id              # Get video metadata
GET    /api/videos/:id/stream       # Stream video content
DELETE /api/videos/:id              # Delete video

// Subtitle Operations
POST   /api/subtitles/generate      # Generate subtitles
GET    /api/subtitles/:id           # Get subtitle content
GET    /api/subtitles/:id/export    # Export subtitles
PUT    /api/subtitles/:id           # Update subtitle timing

// Job Management
GET    /api/jobs/:id                # Get job status
DELETE /api/jobs/:id                # Cancel job
GET    /api/jobs/:id/progress       # Get job progress

// Health and Monitoring
GET    /health                      # Health check
GET    /api/system/status           # System status
```

#### 5.2 API Response Format

```typescript
interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  timestamp: string;
}

interface VideoMetadata {
  id: string;
  filename: string;
  duration: number;
  format: string;
  size: number;
  uploadedAt: string;
  status: 'processing' | 'ready' | 'error';
}

interface SubtitleData {
  id: string;
  videoId: string;
  content: string;
  format: 'vtt' | 'srt' | 'ass';
  language: string;
  accuracy: number;
  createdAt: string;
}
```

### 6. Database Schema (Appwrite)

#### 6.1 Collections

##### Videos Collection
```typescript
interface VideoDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  filename: string;
  originalName: string;
  size: number;
  duration: number;
  format: string;
  mimeType: string;
  bucketId: string;
  fileId: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  metadata: VideoMetadata;
}
```

##### Subtitles Collection
```typescript
interface SubtitleDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  videoId: string;
  content: string;
  format: 'vtt' | 'srt' | 'ass';
  language: string;
  accuracy: number;
  timingAdjustment: number;
  processingTime: number;
  geminiModel: string;
  status: 'generating' | 'ready' | 'error';
}
```

##### Jobs Collection
```typescript
interface JobDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  type: 'subtitle-generation' | 'format-conversion';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  videoId: string;
  subtitleId?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  metadata: JobMetadata;
}
```

### 7. Security Architecture

#### 7.1 Security Layers

```typescript
// Input Validation
app.use('/api/videos', validateVideoUpload);
app.use('/api/subtitles', validateSubtitleRequest);

// Rate Limiting
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 uploads per windowMs
  message: 'Too many uploads, please try again later'
});

// File Validation
const validateVideoFile = (req: Request, res: Response, next: NextFunction) => {
  // Check file type, size, and content
  // Validate against malicious uploads
  // Sanitize file names
};

// CORS Configuration
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### 7.2 File Security

```typescript
// File Upload Security
const upload = multer({
  limits: {
    fileSize: 4 * 1024 * 1024 * 1024, // 4GB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Validate MIME type
    // Check file extension
    // Scan for malicious content
  }
});

// Temporary File Cleanup
const cleanupTempFiles = async (files: string[]) => {
  for (const file of files) {
    try {
      await fs.unlink(file);
    } catch (error) {
      console.error(`Failed to cleanup temp file: ${file}`, error);
    }
  }
};
```

### 8. Performance Optimization

#### 8.1 Memory Management

```typescript
// Streaming for Large Files
const streamVideoUpload = (req: Request, res: Response) => {
  const busboy = new Busboy({ headers: req.headers });
  
  busboy.on('file', (fieldname, file, filename) => {
    const writeStream = fs.createWriteStream(tempPath);
    file.pipe(writeStream);
    
    // Track upload progress
    let uploadedBytes = 0;
    file.on('data', (chunk) => {
      uploadedBytes += chunk.length;
      // Emit progress event
    });
  });
};

// Redis Caching
const cacheVideoMetadata = async (videoId: string, metadata: VideoMetadata) => {
  await redisClient.setex(`video:${videoId}`, 3600, JSON.stringify(metadata));
};
```

#### 8.2 Background Processing

```typescript
// Job Queue Configuration
const queueConfig = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
};

// Worker Configuration
const workerConfig = {
  concurrency: process.env.WORKER_CONCURRENCY || 2,
  limiter: {
    max: 10,
    duration: 60000
  }
};
```

### 9. Monitoring and Logging

#### 9.1 Application Monitoring

```typescript
// Health Check Endpoint
app.get('/health', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkAppwriteHealth(),
      redis: await checkRedisHealth(),
      vertexAI: await checkVertexAIHealth()
    }
  };
  
  res.json(health);
});

// Performance Metrics
const trackApiResponse = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};
```

#### 9.2 Error Handling

```typescript
// Global Error Handler
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  
  // Log error
  console.error(`Error ${statusCode}: ${message}`, error.stack);
  
  // Send error response
  res.status(statusCode).json({
    status: 'error',
    message: statusCode === 500 ? 'Internal Server Error' : message,
    timestamp: new Date().toISOString()
  });
};
```

### 10. Deployment Architecture

#### 10.1 Container Configuration

```dockerfile
# Dockerfile for Node.js Backend
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start application
CMD ["npm", "start"]
```

#### 10.2 Environment Configuration

```typescript
// Environment Variables
interface EnvironmentConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  
  // Appwrite Configuration
  APPWRITE_ENDPOINT: string;
  APPWRITE_PROJECT_ID: string;
  APPWRITE_API_KEY: string;
  
  // Redis Configuration
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  
  // Vertex AI Configuration
  GOOGLE_CLOUD_PROJECT: string;
  GOOGLE_CLOUD_LOCATION: string;
  GOOGLE_APPLICATION_CREDENTIALS: string;
  
  // Application Configuration
  MAX_FILE_SIZE: number;
  UPLOAD_TIMEOUT: number;
  WORKER_CONCURRENCY: number;
}
```

### 11. Integration Points

#### 11.1 Vertex AI Integration

```typescript
// Gemini API Client
export class GeminiService {
  private aiplatform: any;
  
  constructor() {
    this.aiplatform = new aiplatform.v1.PredictionServiceClient({
      apiEndpoint: `${process.env.GOOGLE_CLOUD_LOCATION}-aiplatform.googleapis.com`
    });
  }
  
  async generateSubtitles(audioBuffer: Buffer): Promise<SubtitleResult> {
    const request = {
      endpoint: this.getModelEndpoint(),
      instances: [{ audio: audioBuffer.toString('base64') }]
    };
    
    const [response] = await this.aiplatform.predict(request);
    return this.parseSubtitleResponse(response);
  }
}
```

#### 11.2 Appwrite Integration

```typescript
// Appwrite Service
export class AppwriteService {
  private client: Client;
  private databases: Databases;
  private storage: Storage;
  
  constructor() {
    this.client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT!)
      .setProject(process.env.APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);
    
    this.databases = new Databases(this.client);
    this.storage = new Storage(this.client);
  }
  
  async uploadVideo(file: Express.Multer.File): Promise<string> {
    const fileStream = fs.createReadStream(file.path);
    const result = await this.storage.createFile(
      process.env.APPWRITE_BUCKET_ID!,
      ID.unique(),
      InputFile.fromStream(fileStream, file.originalname, file.size)
    );
    
    return result.$id;
  }
}
```

This architecture document provides a comprehensive overview of the Node.js-based backend system, ensuring scalability, maintainability, and optimal performance for the AI-Powered Subtitle Generator application.