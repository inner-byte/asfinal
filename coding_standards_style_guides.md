# Coding Standards and Style Guides

## Introduction

This document establishes the coding standards and style guides for the AI-powered subtitle generator web application. By adhering to these guidelines, we ensure consistency, readability, and scalability across the codebase. The standards are specifically crafted for our tech stack and project complexity, promoting expert-level practices to prevent common pitfalls and maintain a robust application.

## General Principles

- **Single Responsibility Principle (SRP)**: Each module, component, or function must have one well-defined purpose.
- **DRY (Don’t Repeat Yourself)**: Eliminate redundancy by abstracting reusable logic into functions, components, or utilities.
- **KISS (Keep It Simple, Stupid)**: Prioritize simplicity to reduce technical debt and improve maintainability.
- **YAGNI (You Aren’t Gonna Need It)**: Avoid speculative features or optimizations unless explicitly required.
- **Error Handling**: Implement robust error handling for all operations, including API calls, file processing, and user inputs.
- **Testing**: Achieve at least 80% code coverage with unit and integration tests for critical functionality.

## Frontend: Next.js with TypeScript and TailwindCSS v4

### TypeScript

- **Type Safety**: Leverage TypeScript’s static typing to enforce type definitions for props, state, and API responses, reducing runtime errors.
- **Interfaces vs. Types**: Use interfaces for object shapes; reserve types for unions, intersections, or advanced type constructs.
- **Enums**: Define enums for fixed value sets (e.g., subtitle formats: `SRT`, `VTT`, `ASS`) to enhance code clarity.
- **Strict Mode**: Enable TypeScript’s `strict` mode in `tsconfig.json` to enforce rigorous type checking.

### Next.js

- **Component Structure**: Organize components by feature (e.g., `components/VideoUpload`, `components/SubtitlePreview`) for modularity.
- **Pages**: Keep page components lean, delegating business logic to child components; use Next.js pages solely for routing.
- **API Routes**: Limit Next.js API routes to lightweight tasks; delegate computationally intensive operations to the backend.
- **Data Fetching**: Use `getServerSideProps` for SEO-critical pages; employ client-side fetching (e.g., SWR or React Query) for dynamic updates.

### TailwindCSS v4

- **Utility-First**: Rely on Tailwind’s utility classes for styling; minimize custom CSS to exceptional cases.
- **Responsive Design**: Apply responsive prefixes (e.g., `sm:`, `md:`, `lg:`) to ensure seamless mobile and desktop experiences.
- **Custom Themes**: Centralize custom colors, fonts, and animations in `tailwind.config.js` for consistent branding.
- **Component Extraction**: Extract complex Tailwind class combinations into reusable React components.

### Best Practices

- **State Management**: Use `useState` and `useReducer` for local state; adopt Recoil or Zustand for global state if complexity increases.
- **Hooks**: Encapsulate reusable logic in custom hooks (e.g., `useSubtitleSync` for subtitle timing logic).
- **Performance**: Optimize rendering with `React.memo` and `useCallback`; lazy-load non-critical components with `dynamic`.
- **Accessibility**: Ensure keyboard navigation and provide ARIA labels for all interactive elements.

## Backend: Node.js with Express

### Code Structure

- **Modular Design**: Structure code into directories like `controllers`, `services`, and `utils`, each with a distinct role.
- **Routes**: Define feature-specific routes in a `routes` directory using Express routers for organization.
- **Middleware**: Implement middleware for logging, request validation, and error handling.

### Error Handling

- **Centralized Error Handling**: Use a global error handler to standardize error logging and responses.
- **HTTP Status Codes**: Return precise status codes (e.g., `400` for client errors, `500` for server issues).
- **User-Friendly Messages**: Craft concise, non-technical error messages for frontend display.

### Security

- **Input Validation**: Validate all inputs using Joi or Zod to prevent injection attacks and malformed data.
- **File Uploads**: Sanitize and validate uploaded files (e.g., check MIME types, size limits) to block malicious content.
- **Rate Limiting**: Apply rate limiting (e.g., via `express-rate-limit`) on endpoints like video uploads to mitigate abuse.

### Performance

- **Asynchronous Operations**: Use `async/await` for I/O-bound tasks to ensure non-blocking execution.
- **Streaming**: Stream large files (uploads/downloads) to optimize memory usage.
- **Caching**: Cache frequent computations or database queries in Redis for faster response times.

## Database: Appwrite

### Schema Design

- **Collections**: Create collections for core entities (e.g., `videos`, `subtitles`, `tasks`).
- **Documents**: Store metadata as document attributes (e.g., `videoId`, `format`, `timestamps`).
- **Indexes**: Add indexes on high-query fields (e.g., `videoId`, `userId`) for performance.

### Best Practices

- **Atomic Operations**: Use Appwrite’s built-in atomic updates to ensure data consistency.
- **Error Handling**: Handle database errors gracefully, logging issues and retrying transient failures.
- **Data Validation**: Validate data integrity before writes to prevent corruption.

## Task Management: Redis

### Queue Management

- **Bull Queue**: Implement Bull for task queuing (e.g., video processing, subtitle generation).
- **Job Prioritization**: Assign higher priority to time-sensitive tasks (e.g., subtitle generation over format conversion).
- **Retry Mechanism**: Configure exponential backoff for failed jobs to balance resilience and resource use.

### Best Practices

- **Job Monitoring**: Use Bull’s monitoring tools to track queue health and job statuses.
- **Resource Management**: Cap concurrent jobs to avoid overwhelming server resources.
- **Error Handling**: Log job failures and notify users of persistent issues.

## Testing

- **Unit Tests**: Test individual units (functions, components) with Jest for reliability.
- **Integration Tests**: Verify frontend-backend and service interactions with integration tests.
- **End-to-End Tests**: Use Cypress or Playwright to simulate user flows (e.g., upload to subtitle export).
- **Mocking**: Mock external dependencies (e.g., Appwrite, Redis) to isolate test cases.

## Code Formatting and Linting

- **Prettier**: Enforce consistent formatting with Prettier across all files.
- **ESLint**: Use ESLint with TypeScript and Next.js plugins to catch code quality issues.
- **Stylelint**: Apply Stylelint for TailwindCSS to maintain styling standards.
- **Husky**: Configure pre-commit hooks with Husky to run linters and tests automatically.

## Documentation

- **README**: Include detailed setup, environment variables, and deployment instructions in the project README.
- **API Documentation**: Document backend APIs with Swagger or Postman for clarity.
- **Inline Comments**: Add comments for complex logic or non-obvious implementations.

## Version Control

- **GitHub**: Host the repository on GitHub, using feature branches and pull requests for collaboration.
- **Commit Messages**: Follow Conventional Commits (e.g., `feat:`, `fix:`) for clear, structured messaging.
- **Branching Strategy**: Adopt a GitFlow-inspired approach with `main`, `develop`, and feature branches.
