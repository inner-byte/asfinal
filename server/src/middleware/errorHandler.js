"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
/**
 * Custom error class with status code
 */
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
/**
 * Global error handler middleware - properly typed as Express error handler
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    // Default error values
    let statusCode = 500;
    let message = 'Internal server error';
    // Check if this is our custom error type
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    }
    else if (err instanceof Error) {
        message = err.message || message;
    }
    // Handle Appwrite specific errors (can be expanded as needed)
    if (err.name === 'AppwriteException') {
        statusCode = 400;
    }
    // Build error response
    const errorResponse = {
        status: 'error',
        message
    };
    res.status(statusCode).json(errorResponse);
    // No return statement to match void return type
};
exports.errorHandler = errorHandler;
