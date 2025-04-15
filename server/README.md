# Subtitle Generator Server

This is the backend server for the AI-powered subtitle generator application. It handles video processing, subtitle generation, and storage management.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Appwrite account and project
- Google Cloud account with Gemini API access

### Installation

1. Clone the repository
2. Navigate to the server directory
3. Install dependencies:

```bash
npm install
```

4. Copy the `.env.example` file to `.env` and update the environment variables
5. Start the development server:

```bash
npm run dev
```

## Project Structure

The server follows a modular architecture with clear separation of concerns:

- `src/controllers`: Request handlers for API endpoints
- `src/services`: Business logic and orchestration
- `src/utils`: Utility functions and helpers
- `src/middleware`: Express middleware
- `src/config`: Configuration files
- `src/types`: TypeScript type definitions
- `src/routes`: API route definitions

## API Documentation

API documentation is available at `/api-docs` when the server is running.

## Database Schema

The application uses Appwrite as its database and storage provider. For detailed information about the database schema, see the [Appwrite Schema Documentation](./docs/appwrite_schema.md).

## Configuration

Configuration is managed through environment variables. See `.env.example` for a list of required variables.

## Development

### Code Style

The project uses ESLint and Prettier for code formatting and linting. Run the following commands to check and fix code style:

```bash
npm run lint
npm run format
```

### Adding New Features

When adding new features:

1. Create or update the appropriate controller, service, and utility files
2. Update the API routes if necessary
3. Add tests for the new functionality
4. Update the documentation

## Testing

Run tests with:

```bash
npm test
```

## Deployment

The server can be deployed using Docker. A Dockerfile is provided in the root directory.

```bash
docker build -t subtitle-generator-server .
docker run -p 3001:3001 subtitle-generator-server
```
