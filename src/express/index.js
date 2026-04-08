/**
 * Express Utilities Module
 * Express server creation and middleware adapters
 */

const { createResponse } = require('../aws/lambda');
const { createLogger } = require('../logger');
const { AppError } = require('../error');

/**
 * Create Express application with common middlewares
 * @param {Object} options - Express app options
 * @returns {Object} Express app
 */
function createExpressApp(options = {}) {
    const express = require('express');
    const app = express();

    // Body parsing middleware
    if (options.json !== false) {
        app.use(express.json(options.jsonOptions || { limit: '10mb' }));
    }

    if (options.urlencoded !== false) {
        app.use(express.urlencoded({ extended: true, ...options.urlencodedOptions }));
    }

    // CORS middleware
    if (options.cors !== false) {
        const corsOptions = options.corsOptions || {
            origin: '*',
            methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
            allowedHeaders: 'Content-Type,Authorization,X-Requested-With'
        };

        app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', corsOptions.origin);
            res.header('Access-Control-Allow-Methods', corsOptions.methods);
            res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders);
            res.header('Access-Control-Allow-Credentials', 'true');

            if (req.method === 'OPTIONS') {
                return res.status(204).end();
            }

            next();
        });
    }

    // Request ID middleware
    if (options.requestId !== false) {
        const { generateUUID } = require('../security');
        app.use((req, res, next) => {
            req.requestId = req.headers['x-request-id'] || generateUUID();
            res.setHeader('X-Request-ID', req.requestId);
            next();
        });
    }

    // Request logging middleware
    if (options.logging !== false) {
        const logger = options.logger || createLogger({ service: 'express' });
        app.use((req, res, next) => {
            const startTime = Date.now();

            logger.info('Incoming request', {
                method: req.method,
                path: req.path,
                ip: req.ip,
                userAgent: req.get('user-agent')
            });

            res.on('finish', () => {
                const duration = Date.now() - startTime;
                logger.info('Request completed', {
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode,
                    duration: `${duration}ms`
                });
            });

            next();
        });
    }

    return app;
}

/**
 * Express error handler middleware
 * @param {Object} options - Error handler options
 * @returns {Function} Express error middleware
 */
function errorHandler(options = {}) {
    const logger = options.logger || createLogger({ service: 'express' });
    const includeStack = options.includeStack !== false && process.env.NODE_ENV === 'development';

    return (err, req, res, next) => {
        logger.error('Request error', err, {
            method: req.method,
            path: req.path,
            requestId: req.requestId
        });

        // Handle AppError instances
        if (err instanceof AppError) {
            const response = {
                success: false,
                error: err.message
            };

            if (err.details) {
                response.details = err.details;
            }

            if (includeStack) {
                response.stack = err.stack;
            }

            return res.status(err.statusCode).json(response);
        }

        // Handle validation errors from express-validator
        if (err.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: err.errors || err.details
            });
        }

        // Handle default errors
        const statusCode = err.statusCode || err.status || 500;
        const response = {
            success: false,
            error: err.message || 'Internal server error'
        };

        if (includeStack) {
            response.stack = err.stack;
        }

        res.status(statusCode).json(response);
    };
}

/**
 * Not found handler middleware
 * @returns {Function} Express middleware
 */
function notFoundHandler() {
    return (req, res) => {
        res.status(404).json({
            success: false,
            error: 'Route not found',
            path: req.path,
            method: req.method
        });
    };
}

/**
 * Async handler wrapper for Express routes
 * Catches async errors and passes to error handler
 * @param {Function} fn - Async route handler
 * @returns {Function} Express middleware
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Convert Lambda handler to Express middleware
 * @param {Function} lambdaHandler - Lambda handler function
 * @returns {Function} Express middleware
 */
function lambdaToExpress(lambdaHandler) {
    return async (req, res, next) => {
        try {
            // Convert Express request to Lambda event
            const event = {
                httpMethod: req.method,
                path: req.path,
                pathParameters: req.params,
                queryStringParameters: req.query,
                headers: req.headers,
                body: req.body ? JSON.stringify(req.body) : null,
                requestContext: {
                    requestId: req.requestId,
                    identity: {
                        sourceIp: req.ip,
                        userAgent: req.get('user-agent')
                    }
                }
            };

            const context = {
                requestId: req.requestId,
                functionName: 'express-adapter'
            };

            // Call Lambda handler
            const result = await lambdaHandler(event, context);

            // Convert Lambda response to Express response
            if (result.headers) {
                Object.entries(result.headers).forEach(([key, value]) => {
                    res.setHeader(key, value);
                });
            }

            const body = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
            res.status(result.statusCode || 200).json(body);

        } catch (error) {
            next(error);
        }
    };
}

/**
 * Success response helper
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Optional message
 */
function sendSuccess(res, data, statusCode = 200, message = null) {
    const response = {
        success: true,
        data
    };

    if (message) {
        response.message = message;
    }

    res.status(statusCode).json(response);
}

/**
 * Error response helper
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {*} details - Error details
 */
function sendError(res, message, statusCode = 500, details = null) {
    const response = {
        success: false,
        error: message
    };

    if (details) {
        response.details = details;
    }

    res.status(statusCode).json(response);
}

/**
 * Paginated response helper
 * @param {Object} res - Express response object
 * @param {Array} items - Array of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items count
 */
function sendPaginated(res, items, page, limit, total) {
    const totalPages = Math.ceil(total / limit);

    res.json({
        success: true,
        data: items,
        meta: {
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }
    });
}

/**
 * Start Express server
 * @param {Object} app - Express app
 * @param {number} port - Port number
 * @param {Function} callback - Callback function
 * @returns {Object} HTTP server
 */
function startServer(app, port = 3000, callback) {
    const server = app.listen(port, () => {
        console.log(`✅ Server is running on port ${port}`);
        console.log(`🔗 http://localhost:${port}`);

        if (callback) {
            callback(server);
        }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM signal received: closing HTTP server');
        server.close(() => {
            console.log('HTTP server closed');
        });
    });

    return server;
}

module.exports = {
    createExpressApp,
    errorHandler,
    notFoundHandler,
    asyncHandler,
    lambdaToExpress,
    sendSuccess,
    sendError,
    sendPaginated,
    startServer
};
