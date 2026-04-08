/**
 * Global Error Handler
 * Centralized error handling with custom logic and integrations
 */

const { createLogger } = require('../logger');
const { AppError } = require('./index');

/**
 * Default error handler configuration
 */
const DEFAULT_CONFIG = {
    // Logging
    enableLogging: true,
    logger: null,
    logLevel: 'error',

    // Environment
    environment: process.env.NODE_ENV || 'development',
    includeStackTrace: process.env.NODE_ENV === 'development',

    // Response formatting
    formatResponse: true,
    includeTimestamp: true,
    includeRequestId: true,

    // Error transformation
    transformError: null,

    // Custom handlers
    onError: null,
    beforeLog: null,
    afterLog: null,

    // Monitoring
    reportToMonitoring: false,
    monitoringService: null,

    // Notifications
    notifyOnError: false,
    notificationService: null,
    notifyOnStatusCodes: [500, 502, 503],

    // Security
    sanitizeErrorMessages: true,
    exposeSensitiveData: false,

    // Recovery
    attemptRecovery: false,
    recoveryStrategies: []
};

/**
 * Global Error Handler Class
 */
class GlobalErrorHandler {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.logger = this.config.logger || createLogger({
            service: 'error-handler'
        });
        this.errorStats = {
            total: 0,
            byType: {},
            byStatusCode: {},
            recent: []
        };
    }

    /**
     * Handle error
     * @param {Error} error - Error object
     * @param {Object} context - Request context
     * @returns {Object} Formatted error response
     */
    async handle(error, context = {}) {
        try {
            // Update statistics
            this.updateStats(error);

            // Before log hook
            if (this.config.beforeLog) {
                await this.config.beforeLog(error, context);
            }

            // Transform error if transformer provided
            const transformedError = this.config.transformError
                ? await this.config.transformError(error, context)
                : error;

            // Log error
            if (this.config.enableLogging) {
                this.logError(transformedError, context);
            }

            // After log hook
            if (this.config.afterLog) {
                await this.config.afterLog(transformedError, context);
            }

            // Report to monitoring service
            if (this.config.reportToMonitoring && this.config.monitoringService) {
                await this.reportToMonitoring(transformedError, context);
            }

            // Send notification if needed
            if (this.shouldNotify(transformedError)) {
                await this.sendNotification(transformedError, context);
            }

            // Custom error handler
            if (this.config.onError) {
                await this.config.onError(transformedError, context);
            }

            // Attempt recovery if enabled
            if (this.config.attemptRecovery) {
                const recovered = await this.attemptRecovery(transformedError, context);
                if (recovered) {
                    return recovered;
                }
            }

            // Format and return error response
            return this.formatErrorResponse(transformedError, context);

        } catch (handlerError) {
            // Error in error handler - log and return basic response
            console.error('Error in global error handler:', handlerError);
            return this.getFallbackResponse(error);
        }
    }

    /**
     * Log error with context
     * @private
     */
    logError(error, context) {
        const logData = {
            name: error.name,
            message: error.message,
            statusCode: error.statusCode || 500,
            stack: this.config.includeStackTrace ? error.stack : undefined,
            isOperational: error.isOperational,
            context: {
                requestId: context.requestId,
                userId: context.userId,
                method: context.method,
                path: context.path,
                ip: context.ip,
                userAgent: context.userAgent
            },
            timestamp: new Date().toISOString()
        };

        // Add error details if available
        if (error.details) {
            logData.details = error.details;
        }

        // Log based on error severity
        const statusCode = error.statusCode || 500;
        if (statusCode >= 500) {
            this.logger.error('Server error occurred', error, logData);
        } else if (statusCode >= 400) {
            this.logger.warn('Client error occurred', logData);
        } else {
            this.logger.info('Error occurred', logData);
        }
    }

    /**
     * Format error response
     * @private
     */
    formatErrorResponse(error, context) {
        const statusCode = error.statusCode || 500;
        const isProduction = this.config.environment === 'production';

        // Base response
        const response = {
            success: false,
            error: this.config.sanitizeErrorMessages && isProduction
                ? this.sanitizeMessage(error.message, statusCode)
                : error.message
        };

        // Add status code
        response.statusCode = statusCode;

        // Add error code if available
        if (error.code) {
            response.code = error.code;
        }

        // Add details for client errors or in development
        if (error.details && (statusCode < 500 || !isProduction)) {
            response.details = error.details;
        }

        // Add timestamp if enabled
        if (this.config.includeTimestamp) {
            response.timestamp = new Date().toISOString();
        }

        // Add request ID if enabled
        if (this.config.includeRequestId && context.requestId) {
            response.requestId = context.requestId;
        }

        // Add stack trace in development
        if (this.config.includeStackTrace && !isProduction) {
            response.stack = error.stack;
        }

        // Add documentation link for known errors
        if (error.docUrl) {
            response.docUrl = error.docUrl;
        }

        return response;
    }

    /**
     * Sanitize error message for production
     * @private
     */
    sanitizeMessage(message, statusCode) {
        // Return generic messages for server errors in production
        if (statusCode >= 500) {
            return 'An internal server error occurred';
        }

        // Remove sensitive information patterns
        let sanitized = message;

        // Remove file paths
        sanitized = sanitized.replace(/\/[\w\/.-]+/g, '[PATH]');

        // Remove email addresses
        sanitized = sanitized.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');

        // Remove IP addresses
        sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]');

        // Remove tokens/keys
        sanitized = sanitized.replace(/[a-zA-Z0-9]{32,}/g, '[TOKEN]');

        return sanitized;
    }

    /**
     * Report error to monitoring service
     * @private
     */
    async reportToMonitoring(error, context) {
        try {
            if (typeof this.config.monitoringService === 'function') {
                await this.config.monitoringService(error, context);
            } else if (this.config.monitoringService?.captureException) {
                // Sentry-like interface
                this.config.monitoringService.captureException(error, {
                    contexts: { custom: context },
                    tags: {
                        statusCode: error.statusCode,
                        errorType: error.name
                    }
                });
            }
        } catch (err) {
            this.logger.error('Failed to report to monitoring service', err);
        }
    }

    /**
     * Check if error should trigger notification
     * @private
     */
    shouldNotify(error) {
        if (!this.config.notifyOnError || !this.config.notificationService) {
            return false;
        }

        const statusCode = error.statusCode || 500;
        return this.config.notifyOnStatusCodes.includes(statusCode);
    }

    /**
     * Send error notification
     * @private
     */
    async sendNotification(error, context) {
        try {
            if (typeof this.config.notificationService === 'function') {
                await this.config.notificationService(error, context);
            }
        } catch (err) {
            this.logger.error('Failed to send error notification', err);
        }
    }

    /**
     * Attempt to recover from error
     * @private
     */
    async attemptRecovery(error, context) {
        for (const strategy of this.config.recoveryStrategies) {
            try {
                const result = await strategy(error, context);
                if (result) {
                    this.logger.info('Error recovery successful', {
                        strategy: strategy.name,
                        error: error.message
                    });
                    return result;
                }
            } catch (recoveryError) {
                this.logger.warn('Recovery strategy failed', {
                    strategy: strategy.name,
                    error: recoveryError.message
                });
            }
        }
        return null;
    }

    /**
     * Update error statistics
     * @private
     */
    updateStats(error) {
        this.errorStats.total++;

        // By type
        const type = error.name || 'UnknownError';
        this.errorStats.byType[type] = (this.errorStats.byType[type] || 0) + 1;

        // By status code
        const statusCode = error.statusCode || 500;
        this.errorStats.byStatusCode[statusCode] =
            (this.errorStats.byStatusCode[statusCode] || 0) + 1;

        // Recent errors (keep last 100)
        this.errorStats.recent.unshift({
            type,
            message: error.message,
            statusCode,
            timestamp: new Date().toISOString()
        });

        if (this.errorStats.recent.length > 100) {
            this.errorStats.recent = this.errorStats.recent.slice(0, 100);
        }
    }

    /**
     * Get error statistics
     * @returns {Object}
     */
    getStats() {
        return {
            ...this.errorStats,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Reset error statistics
     */
    resetStats() {
        this.errorStats = {
            total: 0,
            byType: {},
            byStatusCode: {},
            recent: []
        };
    }

    /**
     * Get fallback response when handler fails
     * @private
     */
    getFallbackResponse(error) {
        return {
            success: false,
            error: 'An error occurred',
            statusCode: 500,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Create global error handler instance
 * @param {Object} config - Handler configuration
 * @returns {GlobalErrorHandler}
 */
function createGlobalErrorHandler(config = {}) {
    return new GlobalErrorHandler(config);
}

/**
 * Create Express error middleware from global handler
 * @param {GlobalErrorHandler} handler - Global error handler instance
 * @returns {Function}
 */
function createExpressMiddleware(handler) {
    return async (err, req, res, next) => {
        const context = {
            requestId: req.requestId,
            userId: req.user?.id,
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.get('user-agent')
        };

        const response = await handler.handle(err, context);
        res.status(response.statusCode).json(response);
    };
}

/**
 * Create Lambda error handler
 * @param {GlobalErrorHandler} handler - Global error handler instance
 * @returns {Function}
 */
function createLambdaHandler(handler) {
    return async (error, event, context) => {
        const requestContext = {
            requestId: context.requestId,
            method: event.httpMethod,
            path: event.path,
            ip: event.requestContext?.identity?.sourceIp
        };

        const response = await handler.handle(error, requestContext);

        return {
            statusCode: response.statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(response)
        };
    };
}

/**
 * Wrap async function with error handling
 * @param {Function} fn - Async function
 * @param {GlobalErrorHandler} handler - Global error handler
 * @returns {Function}
 */
function wrapAsync(fn, handler) {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            return await handler.handle(error);
        }
    };
}

module.exports = {
    GlobalErrorHandler,
    createGlobalErrorHandler,
    createExpressMiddleware,
    createLambdaHandler,
    wrapAsync,
    DEFAULT_CONFIG
};
