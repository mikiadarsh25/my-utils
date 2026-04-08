/**
 * Error Recovery Strategies
 * Common patterns for error recovery
 */

/**
 * Retry strategy - Retry operation on transient failures
 * @param {Object} options - Retry options
 * @returns {Function}
 */
function retryStrategy(options = {}) {
    const {
        maxRetries = 3,
        delayMs = 1000,
        exponentialBackoff = true,
        retryableErrors = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND']
    } = options;

    return async function retry(error, context) {
        // Check if error is retryable
        const isRetryable = retryableErrors.includes(error.code) ||
                           error.statusCode >= 500;

        if (!isRetryable || !context.operation) {
            return null;
        }

        // Get current retry count
        const retryCount = context.retryCount || 0;

        if (retryCount >= maxRetries) {
            return null;
        }

        // Calculate delay
        const delay = exponentialBackoff
            ? delayMs * Math.pow(2, retryCount)
            : delayMs;

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));

        try {
            // Retry operation
            const result = await context.operation();
            return {
                success: true,
                data: result,
                recovered: true,
                recoveryMethod: 'retry',
                attempts: retryCount + 1
            };
        } catch (retryError) {
            // Increment retry count for next attempt
            context.retryCount = retryCount + 1;
            return null;
        }
    };
}

/**
 * Fallback strategy - Use fallback value/function on error
 * @param {*} fallbackValue - Fallback value or function
 * @returns {Function}
 */
function fallbackStrategy(fallbackValue) {
    return async function fallback(error, context) {
        try {
            const value = typeof fallbackValue === 'function'
                ? await fallbackValue(error, context)
                : fallbackValue;

            return {
                success: true,
                data: value,
                recovered: true,
                recoveryMethod: 'fallback'
            };
        } catch (fallbackError) {
            return null;
        }
    };
}

/**
 * Circuit breaker strategy - Prevent cascading failures
 * @param {Object} options - Circuit breaker options
 * @returns {Function}
 */
function circuitBreakerStrategy(options = {}) {
    const {
        failureThreshold = 5,
        resetTimeoutMs = 60000,
        halfOpenRetries = 1
    } = options;

    let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    let failureCount = 0;
    let lastFailureTime = null;
    let successCount = 0;

    return async function circuitBreaker(error, context) {
        const now = Date.now();

        // Check if circuit should reset
        if (state === 'OPEN' &&
            lastFailureTime &&
            (now - lastFailureTime) > resetTimeoutMs) {
            state = 'HALF_OPEN';
            successCount = 0;
        }

        // Circuit is open - fail fast
        if (state === 'OPEN') {
            return {
                success: false,
                error: 'Circuit breaker is OPEN',
                statusCode: 503,
                recovered: false,
                circuitState: state
            };
        }

        // Record failure
        failureCount++;
        lastFailureTime = now;

        // Open circuit if threshold reached
        if (failureCount >= failureThreshold) {
            state = 'OPEN';
        }

        // In half-open state, allow limited retries
        if (state === 'HALF_OPEN' && context.operation) {
            try {
                const result = await context.operation();
                successCount++;

                // Close circuit after successful retries
                if (successCount >= halfOpenRetries) {
                    state = 'CLOSED';
                    failureCount = 0;
                }

                return {
                    success: true,
                    data: result,
                    recovered: true,
                    recoveryMethod: 'circuit-breaker',
                    circuitState: state
                };
            } catch (retryError) {
                state = 'OPEN';
                return null;
            }
        }

        return null;
    };
}

/**
 * Cache strategy - Return cached value on error
 * @param {Object} cache - Cache implementation
 * @returns {Function}
 */
function cacheStrategy(cache) {
    return async function cached(error, context) {
        if (!context.cacheKey) {
            return null;
        }

        try {
            const cachedValue = await cache.get(context.cacheKey);

            if (cachedValue !== null && cachedValue !== undefined) {
                return {
                    success: true,
                    data: cachedValue,
                    recovered: true,
                    recoveryMethod: 'cache',
                    stale: true
                };
            }
        } catch (cacheError) {
            // Cache lookup failed
        }

        return null;
    };
}

/**
 * Default value strategy - Return default on specific errors
 * @param {Object} defaults - Map of error types to default values
 * @returns {Function}
 */
function defaultValueStrategy(defaults = {}) {
    return async function defaultValue(error, context) {
        const errorType = error.name || error.constructor.name;

        if (defaults[errorType] !== undefined) {
            return {
                success: true,
                data: defaults[errorType],
                recovered: true,
                recoveryMethod: 'default-value'
            };
        }

        return null;
    };
}

/**
 * Graceful degradation strategy - Return partial results
 * @param {Function} partialHandler - Handler for partial results
 * @returns {Function}
 */
function gracefulDegradationStrategy(partialHandler) {
    return async function gracefulDegradation(error, context) {
        try {
            const partialResult = await partialHandler(error, context);

            if (partialResult) {
                return {
                    success: true,
                    data: partialResult,
                    recovered: true,
                    recoveryMethod: 'graceful-degradation',
                    partial: true,
                    warning: error.message
                };
            }
        } catch (handlerError) {
            // Partial handler failed
        }

        return null;
    };
}

/**
 * Timeout strategy - Set operation timeout
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Function}
 */
function timeoutStrategy(timeoutMs = 5000) {
    return async function timeout(error, context) {
        if (error.code !== 'ETIMEDOUT' || !context.operation) {
            return null;
        }

        try {
            const result = await Promise.race([
                context.operation(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
                )
            ]);

            return {
                success: true,
                data: result,
                recovered: true,
                recoveryMethod: 'timeout'
            };
        } catch (timeoutError) {
            return null;
        }
    };
}

/**
 * Compose multiple strategies
 * @param {...Function} strategies - Recovery strategies
 * @returns {Function}
 */
function composeStrategies(...strategies) {
    return async function composed(error, context) {
        for (const strategy of strategies) {
            const result = await strategy(error, context);
            if (result) {
                return result;
            }
        }
        return null;
    };
}

module.exports = {
    retryStrategy,
    fallbackStrategy,
    circuitBreakerStrategy,
    cacheStrategy,
    defaultValueStrategy,
    gracefulDegradationStrategy,
    timeoutStrategy,
    composeStrategies
};
