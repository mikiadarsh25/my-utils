/**
 * Global Error Handler Examples
 * Advanced error handling patterns
 */

const {
    createGlobalErrorHandler,
    createExpressMiddleware,
    strategies
} = require('../src/error');
const { createExpressApp, startServer } = require('../src/express');
const { NotFoundError, ValidationError } = require('../src/error');

// ========================================
// Example 1: Basic Global Error Handler
// ========================================

const basicHandler = createGlobalErrorHandler({
    enableLogging: true,
    includeStackTrace: true,
    environment: 'development'
});

// ========================================
// Example 2: Production Error Handler
// ========================================

const productionHandler = createGlobalErrorHandler({
    environment: 'production',
    includeStackTrace: false,
    sanitizeErrorMessages: true,

    // Custom error transformation
    transformError: async (error, context) => {
        // Add custom properties
        error.errorId = `ERR-${Date.now()}`;
        error.service = 'api-server';
        return error;
    },

    // Before logging hook
    beforeLog: async (error, context) => {
        console.log(`Processing error: ${error.message}`);
    },

    // After logging hook
    afterLog: async (error, context) => {
        console.log(`Error logged with ID: ${error.errorId}`);
    }
});

// ========================================
// Example 3: Handler with Monitoring
// ========================================

const monitoringHandler = createGlobalErrorHandler({
    reportToMonitoring: true,
    monitoringService: async (error, context) => {
        // Simulate Sentry/DataDog reporting
        console.log('📊 Reporting to monitoring service:', {
            error: error.message,
            context: context.requestId
        });
    }
});

// ========================================
// Example 4: Handler with Notifications
// ========================================

const notificationHandler = createGlobalErrorHandler({
    notifyOnError: true,
    notifyOnStatusCodes: [500, 502, 503],
    notificationService: async (error, context) => {
        // Simulate Slack/email notification
        console.log('🔔 Sending notification:', {
            message: error.message,
            statusCode: error.statusCode,
            path: context.path
        });
    }
});

// ========================================
// Example 5: Handler with Recovery
// ========================================

const recoveryHandler = createGlobalErrorHandler({
    attemptRecovery: true,
    recoveryStrategies: [
        // Retry strategy
        strategies.retryStrategy({
            maxRetries: 3,
            delayMs: 1000,
            exponentialBackoff: true
        }),

        // Fallback strategy
        strategies.fallbackStrategy({
            message: 'Service temporarily unavailable',
            data: null
        }),

        // Cache strategy
        strategies.cacheStrategy({
            get: async (key) => {
                // Mock cache lookup
                return null;
            }
        })
    ]
});

// ========================================
// Example 6: Complete Express App
// ========================================

const app = createExpressApp();

// Create global handler with all features
const globalHandler = createGlobalErrorHandler({
    enableLogging: true,
    environment: process.env.NODE_ENV || 'development',
    includeStackTrace: true,

    // Custom error handler
    onError: async (error, context) => {
        console.log('🚨 Custom error handler triggered');

        // Log to external service
        // await logToExternalService(error);

        // Update metrics
        // await incrementErrorMetric(error.name);
    },

    // Monitoring
    reportToMonitoring: true,
    monitoringService: async (error, context) => {
        // Report to Sentry/DataDog/CloudWatch
        console.log('📊 Reporting to monitoring:', error.message);
    },

    // Notifications for critical errors
    notifyOnError: true,
    notifyOnStatusCodes: [500, 502, 503],
    notificationService: async (error, context) => {
        // Send Slack/email notification
        console.log('🔔 Critical error notification:', {
            error: error.message,
            requestId: context.requestId
        });
    },

    // Recovery strategies
    attemptRecovery: true,
    recoveryStrategies: [
        strategies.retryStrategy({ maxRetries: 2, delayMs: 500 }),
        strategies.fallbackStrategy({ data: [], message: 'Using cached data' })
    ]
});

// ========================================
// Routes
// ========================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        stats: globalHandler.getStats()
    });
});

// Route that throws NotFoundError
app.get('/users/:id', async (req, res) => {
    throw new NotFoundError('User');
});

// Route that throws ValidationError
app.post('/users', async (req, res) => {
    throw new ValidationError('Invalid email', { field: 'email' });
});

// Route that throws generic error
app.get('/error', async (req, res) => {
    throw new Error('Something went wrong');
});

// Route that simulates timeout
app.get('/timeout', async (req, res) => {
    const error = new Error('Request timeout');
    error.code = 'ETIMEDOUT';
    throw error;
});

// Route that simulates server error
app.get('/server-error', async (req, res) => {
    const error = new Error('Database connection failed');
    error.statusCode = 503;
    throw error;
});

// Get error statistics
app.get('/stats', (req, res) => {
    res.json({
        success: true,
        data: globalHandler.getStats()
    });
});

// Reset error statistics
app.post('/stats/reset', (req, res) => {
    globalHandler.resetStats();
    res.json({ success: true, message: 'Statistics reset' });
});

// ========================================
// Apply Global Error Handler
// ========================================

app.use(createExpressMiddleware(globalHandler));

// ========================================
// Start Server
// ========================================

const PORT = process.env.PORT || 3000;

startServer(app, PORT);

console.log('\n📋 Test the error handler:');
console.log('  GET  /health              - Health check with stats');
console.log('  GET  /users/:id           - Throws NotFoundError');
console.log('  POST /users               - Throws ValidationError');
console.log('  GET  /error               - Throws generic error');
console.log('  GET  /timeout             - Simulates timeout error');
console.log('  GET  /server-error        - Simulates server error (503)');
console.log('  GET  /stats               - View error statistics');
console.log('  POST /stats/reset         - Reset statistics');

console.log('\n🎯 Features demonstrated:');
console.log('  ✅ Custom error transformation');
console.log('  ✅ Before/after logging hooks');
console.log('  ✅ Monitoring integration');
console.log('  ✅ Error notifications');
console.log('  ✅ Recovery strategies (retry, fallback, cache)');
console.log('  ✅ Error statistics tracking');
console.log('  ✅ Custom error handling logic');

// ========================================
// Example 7: Using in Lambda
// ========================================

const { createLambdaHandler } = require('../src/error');

const lambdaErrorHandler = createGlobalErrorHandler({
    environment: 'production',
    reportToMonitoring: true,
    monitoringService: async (error, context) => {
        // CloudWatch integration
        console.log('Reporting to CloudWatch:', error);
    }
});

exports.lambdaHandler = async (event, context) => {
    try {
        // Your Lambda logic here
        if (event.error) {
            throw new Error('Lambda error occurred');
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
        };
    } catch (error) {
        const handler = createLambdaHandler(lambdaErrorHandler);
        return await handler(error, event, context);
    }
};

// ========================================
// Example 8: Advanced Recovery Strategies
// ========================================

const advancedHandler = createGlobalErrorHandler({
    attemptRecovery: true,
    recoveryStrategies: [
        // Circuit breaker
        strategies.circuitBreakerStrategy({
            failureThreshold: 5,
            resetTimeoutMs: 30000
        }),

        // Retry with exponential backoff
        strategies.retryStrategy({
            maxRetries: 3,
            delayMs: 1000,
            exponentialBackoff: true,
            retryableErrors: ['ETIMEDOUT', 'ECONNRESET']
        }),

        // Cache fallback
        strategies.cacheStrategy({
            get: async (key) => {
                // Redis/Memcached lookup
                return null;
            }
        }),

        // Default values for specific errors
        strategies.defaultValueStrategy({
            'NotFoundError': [],
            'ValidationError': { valid: false, errors: [] }
        }),

        // Graceful degradation
        strategies.gracefulDegradationStrategy(
            async (error, context) => {
                // Return partial results
                return { data: [], partial: true };
            }
        ),

        // Compose multiple strategies
        strategies.composeStrategies(
            strategies.retryStrategy({ maxRetries: 2 }),
            strategies.fallbackStrategy({ data: null })
        )
    ]
});

console.log('\n✨ Global error handler loaded successfully!');
