# AI-Powered Subtitle Generator

[![Next.js](https://img.shields.io/badge/frontend-Next.js%2015-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-blue)](https://www.typescriptlang.org/)
[![TailwindCSS v4](https://img.shields.io/badge/styling-TailwindCSS%20v4-38bdf8)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/backend-Express-green)](https://expressjs.com/)
[![Appwrite](https://img.shields.io/badge/storage-Appwrite-f02e65)](https://appwrite.io/)
[![Redis](https://img.shields.io/badge/queue-Redis-dc382d)](https://redis.io/)
[![Plyr](https://img.shields.io/badge/player-Plyr-purple)](https://plyr.io/)
[![Vertex AI](https://img.shields.io/badge/AI-Gemini%20flash%202.0-1a73e8)](https://cloud.google.com/vertex-ai)

## Overview

This application generates accurate and real-time subtitles for videos using Google's Gemini-flash-2.0 model via Vertex API. It features a modern interface with real-time subtitle previews and support for multiple export formats.

## Key Features

- **Video Upload** - Support for videos up to 4GB with progress tracking
- **AI-Powered Subtitle Generation** - Using Gemini-flash-2.0 model for high accuracy
- **Real-Time Preview** - Integrated Plyr video player with subtitle synchronization
- **Multi-Format Export** - Support for SRT, VTT, and ASS subtitle formats
- **High Precision** - Timestamp accuracy from ±0.1 to ±3 seconds
- **Modern UI** - Dark theme with gradient accents and smooth animations

## Project Structure

The project is split into two repositories:

- **`abs-ui`** - Next.js frontend application 
- **`abs-server`** - Express backend API

## Technology Stack

### Frontend
- Next.js 15 with App Router
- TypeScript for type safety
- TailwindCSS v4 for styling
- Plyr for video playback

### Backend
- Node.js with Express
- TypeScript
- Appwrite (Database and Storage)
- Redis for task management
- FFmpeg for subtitle processing

## Getting Started

### Prerequisites
- Node.js 20.x or higher
- Redis server
- Appwrite instance
- Google Cloud account with Vertex API access
- FFmpeg installed locally

### Setup Instructions

#### Frontend (abs-ui)
```bash
# Clone the repository
git clone https://github.com/inner-byte/asfinal.git
cd abs-ui

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev
```

#### Backend (abs-server)
```bash
# Clone the repository
git clone https://github.com/your-org/asfinal.git
cd abs-server

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration

# Run development server
npm run dev
```

## Development Guidelines

This project follows strict development guidelines outlined in the following documentation:

- [Project Goals](project_goals.md) - Understanding objectives and requirements
- [Project Roadmap](project_roadmap_and_milestones.md) - Development phases and timeline
- [Project Structure Rules](project_structure_rules.md) - Architectural organization
- [Coding Standards](coding_standards_style_guides.md) - Best practices and style guides

Development progress is tracked in:
- [Progress](progress.md) (to be created) - Development status tracking
- [Tasks](tasks.md) (to be created) - Current task priorities

## Architecture

### Frontend Structure
The frontend follows a feature-based organization within the Next.js App Router structure, with components organized by functionality (VideoUpload, SubtitlePreview, Export).

### Backend Structure
The backend follows an MVC-inspired pattern with controllers, services, and routes organized by feature.

## Deployment

The project uses GitHub Actions for CI/CD with the following workflow:

1. Code pushed to feature branch
2. CI runs tests and linting
3. PR reviewed and merged to develop
4. Staging deployment triggered
5. QA performed on staging
6. Release merged to main
7. Production deployment triggered
