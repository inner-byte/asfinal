import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ApiResponse } from '../types';

/**
 * Custom error class with status code
 */
export class AppError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware - properly typed as Express error handler
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);
  
  // Default error values
  let statusCode = 500;
  let message = 'Internal server error';
  
  // Check if this is our custom error type
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof Error) {
    message = err.message || message;
  }
  
  // Handle Appwrite specific errors (can be expanded as needed)
  if (err.name === 'AppwriteException') {
    statusCode = 400;
  }
  
  // Build error response
  const errorResponse: ApiResponse<null> = {
    status: 'error',
    message
  };
  
  res.status(statusCode).json(errorResponse);
  // No return statement to match void return type
};