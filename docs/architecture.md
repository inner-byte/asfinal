# Architecture Document
## AI-Powered Subtitle Generator Web Application

### 1. Architecture Overview

The AI-Powered Subtitle Generator follows a modern, scalable architecture pattern with clear separation of concerns between the frontend and backend components. The system is designed as a distributed application with the following key characteristics:

- **Frontend**: Next.js with TypeScript (Client-side rendering and SSR)
- **Backend**: Node.js with Express (RESTful API server)
- **Database**: Appwrite (NoSQL database and file storage)
- **Queue System**: Redis with BullMQ (Background job processing)
- **AI Processing**: Google Gemini Developer API (Gemini-flash-2.0 model)

### 2. System Architecture Diagram

The system follows a layered architecture with the following components:

- **Client Layer**: Next.js Frontend with Video Upload, Subtitle Preview, and Export Manager components
- **API Layer**: Node.js + Express Server with Video, Subtitle, and Job Controllers and Services  
- **Service Layer**: Appwrite Database & Storage, Redis Queue/Cache, Google Gemini Developer API, FFmpeg Processing, File System, and Monitoring & Logging

### 3. Backend Architecture (Node.js + Express)

#### 3.1 Directory Structure

The backend follows a standard Node.js/Express application structure with clear separation of concerns:

- **Controllers**: HTTP request handlers for video and subtitle operations
- **Services**: Business logic and external API integrations
- **Routes**: API endpoint definitions
- **Middleware**: Authentication, validation, and error handling
- **Utils**: Helper functions and utilities
- **Config**: Configuration files for external services
- **Types**: TypeScript type definitions

#### 3.2 Core Components

##### Express Application Setup

The Express application is configured with security middleware, CORS, rate limiting, body parsing, routing, and error handling.

##### Controller Layer

The controller layer handles HTTP requests and responses, coordinating between the Express routes and the service layer. Controllers manage video uploads, subtitle operations, and job status tracking.

##### Service Layer

The service layer contains business logic for video processing, subtitle generation, and job management. Services handle interactions with external APIs and databases.

#### 3.3 Background Job Processing

##### BullMQ Integration

The background job service uses BullMQ with Redis for managing subtitle generation jobs. It handles job queuing, processing, progress tracking, and error handling.

### 4. Data Flow Architecture

#### 4.1 Video Upload Flow

The video upload process involves user upload through Express Multer, validation, storage in Appwrite, database record creation, progress updates, metadata extraction using FFmpeg, and database updates.

#### 4.2 Subtitle Generation Flow

The subtitle generation process involves user request, job queue via Redis, background worker processing, Google Gemini Developer API integration, VTT generation, Appwrite storage, database updates, and job status updates to the frontend.

#### 4.3 Real-time Preview Flow

The real-time preview process involves video loading in Plyr player, VTT subtitle loading, cue change events, timestamp synchronization, dynamic adjustment, and UI updates.

### 5. API Design

#### 5.1 RESTful API Endpoints

The API provides endpoints for video management (upload, metadata, streaming, deletion), subtitle operations (generation, content retrieval, export, timing updates), job management (status, cancellation, progress), and health monitoring.

#### 5.2 API Response Format

The API follows a consistent response format with status, data, message, and timestamp fields. Video metadata includes id, filename, duration, format, size, upload timestamp, and processing status. Subtitle data includes id, video reference, content, format, language, accuracy, and creation timestamp.

### 6. Database Schema (Appwrite)

#### 6.1 Collections

##### Videos Collection

The Videos collection stores video metadata including filename, size, duration, format, MIME type, bucket and file IDs, processing status, and metadata.

##### Subtitles Collection

The Subtitles collection stores subtitle content, format, language, accuracy metrics, timing adjustments, processing time, AI model used, and processing status.

##### Jobs Collection

The Jobs collection tracks background job execution including job type, status, progress, associated video and subtitle IDs, error information, timing data, and metadata.

### 7. Security Architecture

#### 7.1 Security Layers

The security architecture includes input validation, rate limiting, file validation, and CORS configuration to protect against malicious uploads and ensure secure API access.

#### 7.2 File Security

File security includes upload size limits (4GB), file type validation, MIME type checking, extension validation, malicious content scanning, and temporary file cleanup.

### 8. Performance Optimization

#### 8.1 Memory Management

Memory management includes streaming for large file uploads, upload progress tracking, and Redis caching for video metadata to optimize performance and reduce memory usage.

#### 8.2 Background Processing

Background processing includes job queue configuration with retry attempts, exponential backoff, job cleanup, and worker configuration with concurrency limits and rate limiting.

### 9. Monitoring and Logging

#### 9.1 Application Monitoring

Application monitoring includes health check endpoints for database, Redis, and Google Gemini Developer API services, along with performance metrics tracking for API response times.

#### 9.2 Error Handling

Error handling includes a global error handler that logs errors, determines appropriate status codes, and sends structured error responses to the client.

### 10. Deployment Architecture

#### 10.1 Container Configuration

The container configuration uses Node.js Alpine image, installs production dependencies, builds TypeScript, exposes the appropriate port, includes health checks, and starts the application.

#### 10.2 Environment Configuration

Environment configuration includes port settings, Node.js environment, Appwrite configuration, Redis configuration, Google Gemini Developer API configuration, and application-specific settings like file size limits and worker concurrency.

### 11. Integration Points

#### 11.1 Google Gemini Developer API Integration

The Google Gemini Developer API integration handles subtitle generation using the Gemini model with audio buffer processing and subtitle response parsing.

#### 11.2 Appwrite Integration

The Appwrite integration provides database and storage services with client configuration, database operations, and file storage capabilities including video upload handling.

This architecture document provides a comprehensive overview of the Node.js-based backend system, ensuring scalability, maintainability, and optimal performance for the AI-Powered Subtitle Generator application.