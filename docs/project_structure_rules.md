# Project Structure Rules

## Introduction

This document outlines the project structure rules for the AI-powered subtitle generator web application. The structure is designed to be professional, manageable, and scalable, adhering to the single-responsibility principle. Each directory and file has a specific purpose, ensuring clarity and ease of maintenance. The structure is tailored to our tech stack: Next.js with TypeScript and TailwindCSS v4 (frontend), Node.js with Express (backend), Appwrite (database and storage), and Redis (likely with BullMQ) for background task management. Best practices are incorporated to align with modern development standards and to prevent common issues.

## Repository Overview

The project is split into two main repositories to separate concerns between the frontend and backend:

- `ui`: Contains the Next.js application.
- `server`: Contains the Node.js/Express application.

Both repositories are hosted on GitHub, with CI/CD pipelines configured via GitHub Actions.

## Frontend: subtitle-generator-frontend (Next.js with TypeScript and TailwindCSS v4)

### Directory Structure

```
ui/
├── app/                    # Next.js app directory (App Router)
│   ├── layout.tsx          # Root layout for shared UI components
│   ├── page.tsx            # Home page (main entry point)
│   ├── globals.css         # Global styles (minimal, mostly Tailwind imports)
│   ├── video-upload/       # Feature-specific page for video upload
│   │   └── page.tsx
│   ├── subtitle-preview/   # Feature-specific page for subtitle preview
│   │   └── page.tsx
│   └── export/             # Feature-specific page for subtitle export
│       └── page.tsx
├── components/             # Reusable React components
│   ├── VideoUpload/        # Video upload feature components
│   │   ├── DragDrop.tsx    # Drag-and-drop upload component
│   │   └── ProgressBar.tsx # Upload progress indicator
│   ├── SubtitlePreview/    # Subtitle preview feature components
│   │   ├── PlyrPlayer.tsx  # Plyr video player wrapper
│   │   └── SubtitleCue.tsx # Dynamic subtitle cue renderer
│   ├── Export/             # Export feature components
│   │   └── FormatSelector.tsx # Subtitle format selector (SRT, VTT, ASS)
│   └── UI/                 # Shared UI components
│       ├── Button.tsx      # Reusable button component
│       └── Loader.tsx      # Reusable loading spinner
├── hooks/                  # Custom React hooks
│   ├── useSubtitleSync.ts  # Hook for subtitle synchronization
│   └── useVideoUpload.ts   # Hook for video upload handling
├── lib/                    # Utility functions and API clients
│   ├── api.ts              # API client for backend communication
│   ├── plyr.ts             # Plyr configuration and utilities
│   └── ffmpeg.ts           # FFmpeg wrapper for client-side tasks (if needed)
├── public/                 # Static assets
│   ├── favicon.ico         # Favicon
│   └── assets/             # Images, fonts, etc.
├── styles/                 # Custom CSS (if needed beyond Tailwind)
│   └── animations.css      # Custom animations for UI transitions
├── types/                  # TypeScript type definitions
│   ├── video.ts            # Types for video metadata
│   └── subtitle.ts         # Types for subtitle data (e.g., VTT, SRT, ASS)
├── .eslintrc.ts            # ESLint configuration
├── .prettierrc             # Prettier configuration
├── tailwind.config.ts      # TailwindCSS configuration
├── tsconfig.json           # TypeScript configuration
├── next.config.ts          # Next.js configuration
├── package.json            # Dependencies and scripts
└── README.md               # Project setup and usage instructions
```

### Implementation Strategy and Best Practices

- **App Router**: Use Next.js 15’s App Router (`app/` directory) for modern routing and layout management, ensuring optimal performance and SEO.
- **Feature-Based Structure**: Organize pages and components by feature (`video-upload`, `subtitle-preview`, `export`) to maintain modularity and single responsibility.
- **TypeScript**: Define types in the `types/` directory for video and subtitle data, ensuring type safety across the application.
- **TailwindCSS v4**: Centralize custom themes (e.g., dark gray base, gradient accents) in `tailwind.config.ts`. Use utility classes for 90% of styling, reserving `styles/` for complex animations.
- **Components**: Keep components small and focused; extract shared UI elements (e.g., `Button`, `Loader`) into `components/UI/`.
- **Hooks**: Encapsulate reusable logic (e.g., subtitle synchronization, video upload) in custom hooks for better maintainability.
- **Static Assets**: Store static files in `public/`, ensuring efficient access for images and icons.
- **Linting and Formatting**: Configure ESLint and Prettier with strict rules to enforce code quality and consistency.

## Backend: subtitle-generator-backend (Node.js with Express)

### Directory Structure

```
server/
├── src/                    # Source code
│   ├── config/             # Configuration files
│   │   ├── appwrite.ts     # Appwrite client configuration
│   │   ├── redis.ts        # Redis client and cache configuration
│   │   ├── memoryCache.ts  # In-memory cache configuration (if kept separate)
│   │   └── vertex.ts       # Vertex AI API configuration
│   ├── controllers/        # Request handlers
│   │   ├── video.ts        # Video upload and processing controller
│   │   ├── subtitle.ts     # Subtitle generation controller
│   │   └── export.ts       # Subtitle export controller
│   ├── middleware/         # Express middleware
│   │   ├── errorHandler.ts # Global error handler
│   │   ├── validator.ts    # Input validation middleware
│   │   └── rateLimit.ts    # Rate limiting middleware
│   ├── routes/             # API routes
│   │   ├── video.ts        # Video-related endpoints
│   │   ├── subtitle.ts     # Subtitle generation endpoints
│   │   └── export.ts       # Subtitle export endpoints
│   ├── services/           # Business logic
│   │   ├── videoService.ts # Video upload and storage logic
│   │   ├── subtitleService.ts # Subtitle generation and sync logic
│   │   ├── exportService.ts # Subtitle format conversion logic
│   │   ├── appwriteService.ts # Appwrite database/storage interactions
│   │   ├── redisService.ts # Redis cache and potentially queue interactions
│   │   ├── backgroundJobService.ts # Background job queue management (Phase 5 - likely using BullMQ)
│   │   └── ffmpegService.ts # FFmpeg wrapper for subtitle alignment
│   ├── utils/              # Utility functions
│   │   ├── logger.ts       # Logging utility
│   │   └── fileHandler.ts  # File streaming and validation
│   ├── types/              # TypeScript type definitions
│   │   ├── video.ts        # Types for video metadata
│   │   └── subtitle.ts     # Types for subtitle data
│   └── index.ts            # Application entry point
├── tests/                  # Test files
│   ├── unit/               # Unit tests
│   │   └── subtitle.test.ts
│   ├── integration/        # Integration tests
│   │   └── video.test.ts
│   └── e2e/                # End-to-end tests
│       └── export.test.ts
├── .eslintrc.js            # ESLint configuration
├── .prettierrc             # Prettier configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies and scripts
└── README.md               # Project setup and usage instructions
```

### Implementation Strategy and Best Practices

- **TypeScript**: Use TypeScript for type safety, defining types in `src/types/` for video and subtitle data.
- **MVC Pattern**: Follow a Model-View-Controller-inspired structure with `controllers`, `services`, and `routes` to separate concerns.
- **Services**: Encapsulate business logic in `services/` (e.g., `subtitleService.ts` for subtitle generation, `ffmpegService.ts` for timestamp alignment).
- **Configuration**: Centralize configurations in `config/` for Appwrite, Redis, and Vertex AI API clients.
- **Middleware**: Implement middleware for error handling, input validation (using Joi or Zod), and rate limiting to enhance security and reliability.
- **Testing**: Organize tests into `unit`, `integration`, and `e2e` directories, ensuring comprehensive coverage.
- **File Handling**: Use streaming for large file uploads/downloads in `utils/fileHandler.ts` to optimize memory usage.

## Appwrite Integration

- **Database**: Use Appwrite’s document-based database to store metadata in collections like `videos` and `subtitles`.
- **Storage**: Leverage Appwrite Bucket Storage for video and subtitle files, ensuring efficient access and management.
- **Implementation**: Centralize Appwrite interactions in `src/services/appwriteService.ts` for reusability and maintainability.

## Background Task Management (Redis Integration)

- **Queue Management**: Implement a Redis-backed background job queue (e.g., BullMQ) for task management, configured in `src/config/redis.ts` and managed via `src/services/backgroundJobService.ts`.
- **Implementation**: Define jobs for video processing, subtitle generation, and format conversion, ensuring proper prioritization and retry mechanisms using the chosen Redis queue library.

## Version Control and CI/CD

- **GitHub**: Both repositories (`subtitle-generator-frontend` and `subtitle-generator-backend`) are hosted on GitHub.
- **Branching**: Use a GitFlow-inspired strategy with `main`, `develop`, and feature branches (e.g., `feature/video-upload`).
- **CI/CD**: Configure GitHub Actions to run linting, tests, and deployments on push/pull requests.

## Best Practices for Scalability and Maintenance

- **Single Responsibility**: Ensure each file and directory has a single, well-defined purpose to simplify debugging and updates.
- **Modularity**: Use feature-based organization to make adding new features (e.g., live subtitle generation) straightforward.
- **Documentation**: Include inline comments for complex logic and maintain a detailed `README.md` in each repository.
- **Dependency Management**: Regularly update dependencies in `package.json` to leverage the latest features and security patches.
