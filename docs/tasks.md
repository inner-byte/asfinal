# AI-Powered Subtitle Generator Tasks

This document outlines all tasks for the AI-powered subtitle generator web application, organized by development phase. Tasks are prioritized and sequenced according to dependencies and the project roadmap.

## Task Status Legend
- ✅ Complete
- 🔄 In Progress
- ⏳ Pending
- 🔴 Blocked

## Phase 1: Project Setup and Initial Development

### Repository Setup
- ✅ Create `ui` and `server` repositories with initial Next.js and Express projects
- ✅ Configure ESLint, Prettier, and TypeScript in both repositories
- ✅ Set up GitHub Actions for CI/CD pipelines
- ✅ Create development environment setup documentation

### Frontend Initial Setup
- ✅ Initialize Next.js project with TypeScript and TailwindCSS v4
- ✅ Set up project structure according to `project_structure_rules.md`
- ✅ Create basic layout with placeholder components
- ✅ Implement basic routing using Next.js App Router

### Backend Initial Setup
- ✅ Initialize Express project with TypeScript
- ✅ Set up project structure according to `project_structure_rules.md`
- ✅ Configure middleware for error handling, validation, and logging
- ✅ Set up basic API endpoints structure

### Appwrite Integration
- ✅ Set up Appwrite project and configure access credentials
- ✅ Create database collections for videos and subtitles
- ✅ Configure storage buckets for video and subtitle files
- ✅ Implement `appwriteService.ts` for database and storage interactions (Initial version)

### Video Upload Feature
- ✅ Create frontend components for video upload (DragDrop.tsx, ProgressBar.tsx)
- ✅ Implement `useVideoUpload` hook for handling uploads
- ✅ Create backend API endpoints for video upload
- ✅ Implement video validation and streaming to Appwrite storage
- ✅ Add frontend-backend integration tests for upload workflow (Basic tests done)

### Gemini Integration (Refined Pipeline - Next Steps)
- **Note:** Refer to `#file:gemini_transcription_implementation.md` for detailed steps and context for this section.
- ✅ Configure Vertex API client for Gemini-flash-2.0 model (`config/vertex.ts`)
- ✅ Implement audio extraction utility using `fluent-ffmpeg` (`utils/ffmpegUtils.ts`)
- ✅ Implement GCS upload/delete utilities for intermediate audio (`utils/gcsUtils.ts`)
- ✅ Update `subtitleService.ts` to orchestrate the full pipeline:
    - ✅ Fetch video stream from Appwrite
    - ✅ Call `extractAudioToTempFile`
    - ✅ Call `uploadToGcs`
    - ✅ Call Gemini API (`transcribeAudioWithGemini`) with GCS URI and retry logic (`async-retry`)
    - ✅ Implement robust VTT formatting (`formatRawTranscriptionToVTT`)
    - ✅ Store VTT in Appwrite Storage (`subtitles_bucket`)
    - ✅ Update Appwrite Database (`subtitles` collection) with VTT fileId and video status
    - ✅ Implement cleanup logic (`cleanupTempFile`, `deleteFromGcs`) in `finally` block
- ✅ Update `subtitleController.ts` to call the refined `generateSubtitles` service method
- ✅ Add API endpoints for getting subtitle metadata (`GET /api/videos/:videoId/subtitles`) and content (`GET /api/subtitles/:fileId/content`)
- ✅ Add comprehensive error handling throughout the pipeline
- ✅ Add necessary environment variables (e.g., `BACKEND_GCS_BUCKET_NAME`)

### Video Player Integration
- **Note:** Refer to `docs/player_implementation.md` for detailed implementation guide for Plyr integration.
- ⏳ Integrate Plyr video player with basic subtitle support (`components/SubtitlePreview/PlyrPlayer.tsx`)
- ⏳ Implement video playback component with subtitle display (Connect VTT content fetch)
- ⏳ Create initial UI for video player controls

## Phase 2: Real-time Subtitle Preview and Synchronization

### Subtitle Preview
- ⏳ Implement `useSubtitleSync` hook for subtitle synchronization
- ⏳ Configure Plyr's `cuechange` event handling
- ⏳ Create SubtitleCue.tsx component for rendering captions (if needed beyond Plyr's native display)
- ⏳ Add real-time subtitle display during video playback (Verify Plyr integration)

### Timestamp Correction
- ⏳ Research optimal FFmpeg commands/libraries for alignment
- ⏳ Integrate FFmpeg for subtitle timestamp alignment (`ffmpegService.ts` or similar)
- ⏳ Implement backend service for timestamp correction logic
- ⏳ Create API endpoints for timestamp adjustment requests (if manual trigger needed)
- ⏳ Develop algorithms/heuristics to meet ±0.1 to ±3 seconds accuracy requirement
- ⏳ Add validation and testing for timestamp accuracy

### Synchronization Testing
- ⏳ Develop test cases for various video types and durations
- ⏳ Create test suite for subtitle synchronization accuracy
- ⏳ Implement automated tests for timestamp correction
- ⏳ Document test results and accuracy metrics

## Phase 3: Subtitle Export and Format Conversion

### Format Conversion
- ⏳ Research libraries or implement VTT to SRT conversion utility
- ⏳ Research libraries or implement VTT to ASS conversion utility
- ⏳ Create backend service (`exportService.ts`) for on-demand format conversion
- ⏳ Add validation for converted subtitle files

### Export Feature
- ⏳ Create FormatSelector.tsx component for format selection
- ⏳ Implement export functionality in the frontend (trigger download)
- ⏳ Create API endpoints for subtitle export requests (`controllers/export.ts`, `routes/export.ts`)
- ⏳ Add download functionality for exported subtitles (Set headers in response)
- ⏳ Implement error handling for export failures

## Phase 4: UI/UX Enhancement and Optimization

### Modern UI Implementation
- ✅ Apply "lipsync-2" inspired design with dark gray base and gradient accents (Initial pass done)
- ✅ Implement improved typography with Inter or Poppins fonts (Initial pass done)
- ⏳ Create animated transitions for UI elements
- ⏳ Design glowing drop zones for video uploads (Refine existing)
- ⏳ Implement progress indicators for processing tasks (Connect to backend status - Phase 5)

### Responsive Design
- ⏳ Ensure responsive layout for all screen sizes
- ⏳ Optimize mobile experience for video playback
- ⏳ Implement responsive controls for subtitle preview
- ⏳ Test and validate responsive behavior

### Performance Optimization
- ⏳ Optimize component rendering with React.memo and useCallback
- ⏳ Implement lazy loading for non-critical components
- ⏳ Optimize video player initialization
- ⏳ Reduce bundle size through code splitting

## Phase 5: Backend Optimization and Redis Integration

### Redis & Queue Setup
- ⏳ Install Redis server (or configure cloud instance)
- ⏳ Install `ioredis` and `bullmq` packages
- ⏳ Implement Redis connection logic (`config/redis.ts`)
- ⏳ Configure BullMQ `Queue` and `Worker` instances (`services/backgroundJobService.ts` or dedicated worker file)
- ⏳ Define subtitle generation queue and worker process
- ⏳ Configure job prioritization and retry mechanisms within BullMQ

### Task Management
- ⏳ Refactor `subtitleController.generateSubtitles` to enqueue job via BullMQ instead of running synchronously
- ⏳ Implement backend service/logic for task status tracking (e.g., update DB, use BullMQ events)
- ⏳ Create API endpoints for fetching task status (`GET /api/jobs/:jobId/status`)
- ⏳ Implement notification system (e.g., WebSockets - optional) for task completion updates to frontend

### Caching Implementation (Optional but Recommended)
- ⏳ Implement Redis caching for frequently accessed data (e.g., video metadata, subtitle content) using `redisService.ts`
- ⏳ Add cache invalidation logic where data is updated/deleted

### Large File Handling
- ✅ Optimize video streaming for files up to 4GB (Implemented via streaming download + ffmpeg pipe - *pending verification in Gemini pipeline*)
- ✅ Implement chunked upload mechanism (Handled by Appwrite SDK/frontend library if applicable, or ensure server handles stream correctly)
- ⏳ Configure memory-efficient processing pipelines (Review FFmpeg/Gemini steps for memory usage)
- ✅ Add validation for large file uploads (Implemented in `useVideoUpload` hook)

## Phase 6: Testing, Bug Fixing, and Deployment Preparation

### Comprehensive Testing
- ⏳ Create unit tests for critical components and services (e.g., VTT formatting, API logic)
- ⏳ Implement integration tests for API endpoints (upload, generate, get subtitles, get content)
- ⏳ Develop end-to-end tests for user workflows (upload -> preview -> export)
- ⏳ Test edge cases for large videos (near 4GB), various formats, silent videos, non-speech audio

### Bug Fixing
- ⏳ Address issues identified during testing
- ⏳ Fix performance bottlenecks (identified in Phase 4/5)
- ⏳ Resolve UI/UX inconsistencies
- ⏳ Ensure cross-browser compatibility

### Deployment Preparation
- ⏳ Configure production environment variables (`.env.production`)
- ⏳ Create deployment scripts (Dockerfile, docker-compose.prod.yml, etc.)
- ⏳ Set up monitoring tools (e.g., Prometheus, Grafana, Sentry)
- ⏳ Prepare documentation for deployment process

## Phase 7: Deployment and Monitoring

### Deployment
- ✅ Deploy frontend application (e.g., Vercel, Docker)
- ✅ Deploy backend application (e.g., Cloud Run, K8s, Docker)
- ✅ Configure production database and storage (Appwrite Cloud or self-hosted production instance)
- ⏳ Set up production Redis instance and configure BullMQ workers

### Monitoring
- ⏳ Implement application performance monitoring (APM)
- ⏳ Configure error tracking and alerts (e.g., Sentry)
- ⏳ Set up usage analytics (optional)
- ⏳ Create monitoring dashboard (e.g., Grafana)

### User Feedback
- ⏳ Collect initial user feedback post-deployment
- ⏳ Prioritize feedback-based improvements
- ⏳ Create plan for iterative enhancements