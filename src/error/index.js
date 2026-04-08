/**
 * Error Utilities Module
 * Custom error classes and error handling helpers
 */

/**
 * Base Application Error
 */
class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Validation Error (400)
 */
class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, 400, details);
    }
}

/**
 * Authentication Error (401)
 */
class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401);
    }
}

/**
 * Authorization Error (403)
 */
class AuthorizationError extends AppError {
    constructor(message = 'Access forbidden') {
        super(message, 403);
    }
}

/**
 * Not Found Error (404)
 */
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404);
    }
}

/**
 * Conflict Error (409)
 */
class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409);
    }
}

/**
 * Internal Server Error (500)
 */
class InternalServerError extends AppError {
    constructor(message = 'Internal server error') {
        super(message, 500);
    }
}

/**
 * Format error for API response
 * @param {Error} error - Error object
 * @returns {Object}
 */
function formatError(error) {
    const formatted = {
        success: false,
        error: error.message || 'An error occurred'
    };

    if (error.statusCode) {
        formatted.statusCode = error.statusCode;
    }

    if (error.details) {
        formatted.details = error.details;
    }

    if (process.env.NODE_ENV === 'development' && error.stack) {
        formatted.stack = error.stack;
    }

    return formatted;
}

/**
 * Check if error is operational (expected)
 * @param {Error} error - Error object
 * @returns {boolean}
 */
function isOperationalError(error) {
    return error.isOperational === true;
}

/**
 * Log error with context
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
function logError(error, context = {}) {
    const errorLog = {
        timestamp: new Date().toISOString(),
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack,
        ...context
    };

    console.error(JSON.stringify(errorLog));
}

// Export global error handler
const globalHandler = require('./globalHandler');
const strategies = require('./strategies');
const integrations = require('./integrations');
const uncaughtHandler = require('./uncaughtHandler');

module.exports = {
    // Error classes
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    InternalServerError,

    // Error utilities
    formatError,
    isOperationalError,
    logError,

    // Global error handler
    ...globalHandler,

    // Recovery strategies
    strategies,

    // Notification integrations
    integrations,

    // Uncaught error handler
    ...uncaughtHandler
};
