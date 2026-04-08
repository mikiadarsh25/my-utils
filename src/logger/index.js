/**
 * Logger Utilities Module
 * Structured logging helpers
 */

const LOG_LEVELS = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
};

class Logger {
    constructor(context = {}) {
        this.context = context;
        this.level = process.env.LOG_LEVEL || 'INFO';
    }

    /**
     * Format log message
     * @private
     */
    _format(level, message, meta = {}) {
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            level,
            message,
            ...this.context,
            ...meta
        });
    }

    /**
     * Check if log level should be logged
     * @private
     */
    _shouldLog(level) {
        const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        return levels.indexOf(level) >= levels.indexOf(this.level);
    }

    debug(message, meta = {}) {
        if (this._shouldLog('DEBUG')) {
            console.log(this._format('DEBUG', message, meta));
        }
    }

    info(message, meta = {}) {
        if (this._shouldLog('INFO')) {
            console.log(this._format('INFO', message, meta));
        }
    }

    warn(message, meta = {}) {
        if (this._shouldLog('WARN')) {
            console.warn(this._format('WARN', message, meta));
        }
    }

    error(message, error = null, meta = {}) {
        if (this._shouldLog('ERROR')) {
            const errorInfo = error ? {
                error: error.message,
                stack: error.stack
            } : {};
            console.error(this._format('ERROR', message, { ...errorInfo, ...meta }));
        }
    }

    /**
     * Create child logger with additional context
     */
    child(additionalContext) {
        return new Logger({ ...this.context, ...additionalContext });
    }
}

/**
 * Create logger instance
 * @param {Object} context - Context to include in all logs
 * @returns {Logger}
 */
function createLogger(context = {}) {
    return new Logger(context);
}

/**
 * Log request information
 * @param {Object} event - Request event
 */
function logRequest(event) {
    const logger = createLogger({ type: 'request' });
    logger.info('Incoming request', {
        method: event.httpMethod || event.requestContext?.http?.method,
        path: event.path || event.requestContext?.http?.path,
        ip: event.requestContext?.identity?.sourceIp,
        userAgent: event.headers?.['User-Agent']
    });
}

/**
 * Log response information
 * @param {number} statusCode - Response status code
 * @param {number} duration - Request duration in ms
 */
function logResponse(statusCode, duration) {
    const logger = createLogger({ type: 'response' });
    logger.info('Request completed', {
        statusCode,
        duration: `${duration}ms`
    });
}

module.exports = {
    Logger,
    createLogger,
    logRequest,
    logResponse,
    LOG_LEVELS
};
