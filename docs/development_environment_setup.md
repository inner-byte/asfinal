# Development Environment Setup Guide

This document provides instructions for setting up the development environment for the AI-Powered Subtitle Generator project, covering both the frontend (abs-ui) and backend (abs-server).

## Prerequisites

- Node.js (v20 or later)
- npm (v10 or later)
- Git

## Frontend Setup (abs-ui)

The frontend is built with Next.js 15, React 19, TypeScript, and TailwindCSS 4.

### Setup Steps

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-directory>/abs-ui
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and fill in the necessary values for your development environment.

4. Start the development server:
   ```bash
   npm run dev
   ```
   
   The frontend will be available at http://localhost:3000.

5. Available scripts:
   - `npm run dev`: Start the development server with hot reloading
   - `npm run build`: Build the production version
   - `npm run start`: Run the production build
   - `npm run lint`: Check code quality with ESLint
   - `npm run format`: Format code using Prettier
   - `npm run format:check`: Check code formatting without modifying files

## Backend Setup (abs-server)

The backend is built with Node.js, Express, TypeScript, and integrates with Appwrite.

### Setup Steps

1. Navigate to the backend directory:
   ```bash
   cd <repository-directory>/abs-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in the necessary values for your development environment, including:
   - Appwrite API credentials
   - Vertex AI API credentials
   - Application port settings

4. Start the development server:
   ```bash
   npm run dev
   ```
   
   The backend will be available at http://localhost:8080 (or the port specified in your .env file).

5. Available scripts:
   - `npm run dev`: Start the development server with hot reloading
   - `npm run build`: Compile TypeScript to JavaScript
   - `npm run start`: Run the compiled code in production mode
   - `npm run lint`: Check code quality with ESLint
   - `npm run lint:fix`: Fix ESLint issues automatically
   - `npm run format`: Format code using Prettier
   - `npm run format:check`: Check code formatting without modifying files

## Project Configuration Files

### Frontend Configuration

- **TypeScript**: The project uses `tsconfig.json` for TypeScript configuration with strict type checking.
- **ESLint**: The project uses `eslint.config.mjs` for linting rules.
- **Prettier**: The project uses `.prettierrc` for code formatting rules.
- **TailwindCSS**: The project uses `tailwind.config.ts` for Tailwind configuration.

### Backend Configuration

- **TypeScript**: The project uses `tsconfig.json` for TypeScript configuration with strict type checking.
- **ESLint**: The project uses `.eslintrc.js` for linting rules.
- **Prettier**: The project uses `.prettierrc` for code formatting rules.

## Git Workflow

1. Create a feature branch from the main branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them with descriptive messages:
   ```bash
   git add .
   git commit -m "feat: add feature X"
   ```

3. Push your branch to the remote repository:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Create a pull request to the main branch.

5. After code review and CI checks pass, the pull request can be merged.

## Continuous Integration

Both repositories have GitHub Actions workflows configured for CI/CD. The workflows will run on push to the main branch and on pull requests targeting the main branch. The CI workflow checks:

1. Code formatting with Prettier
2. Code quality with ESLint
3. TypeScript compilation
4. Project builds successfully

## Troubleshooting

### Common Issues

1. **Node version mismatch**: Ensure you're using Node.js v20+ as specified in the prerequisites.
2. **Port conflicts**: If ports are already in use, you can modify them in the environment variables.
3. **TypeScript errors**: Make sure to follow the project's type definitions.
4. **Environment variables**: Ensure all required environment variables are set correctly.

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Documentation](https://expressjs.com/en/api.html)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Appwrite Documentation](https://appwrite.io/docs)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)

For any other issues, please refer to the project's issue tracker or contact the development team.