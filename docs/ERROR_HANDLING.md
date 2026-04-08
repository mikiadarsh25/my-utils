# Error Handling Guide

Complete guide to error handling with custom error classes, global handlers, and recovery strategies.

## Table of Contents
- [Custom Error Classes](#custom-error-classes)
- [Global Error Handler](#global-error-handler)
- [Recovery Strategies](#recovery-strategies)
- [Integration Examples](#integration-examples)
- [Best Practices](#best-practices)

## Custom Error Classes

### Built-in Error Classes

```javascript
const {
    AppError,              // Base error class
    ValidationError,       // 400 - Validation failed
    AuthenticationError,   // 401 - Authentication required
    AuthorizationError,    // 403 - Access forbidden
    NotFoundError,         // 404 - Resource not found
    ConflictError,         // 409 - Resource already exists
    InternalServerError    // 500 - Internal server error
} = require('my-utils/src/error');

// Usage
throw new NotFoundError('User');
throw new ValidationError('Invalid email', { field: 'email' });
throw new AuthorizationError('Insufficient permissions');
```

### Creating Custom Errors

```javascript
const { AppError } = require('my-utils/src/error');

class RateLimitError extends AppError {
    constructor(limit, resetTime) {
        super(`Rate limit exceeded. Try again after ${resetTime}`, 429);
        this.limit = limit;
        this.resetTime = resetTime;
    }
}

throw new RateLimitError(100, '60 seconds');
```

## Global Error Handler

### Basic Setup

```javascript
const { createGlobalErrorHandler } = require('my-utils/src/error');

const errorHandler = createGlobalErrorHandler({
    enableLogging: true,
    environment: 'production',
    includeStackTrace: false,
    sanitizeErrorMessages: true
});

// Handle error
const response = await errorHandler.handle(error, context);
```

### Configuration Options

```javascript
const handler = createGlobalErrorHandler({
    // Logging
    enableLogging: true,
    logger: customLogger,
    logLevel: 'error',

    // Environment
    environment: 'production',
    includeStackTrace: false,

    // Response formatting
    formatResponse: true,
    includeTimestamp: true,
    includeRequestId: true,

    // Error transformation
    transformError: async (error, context) => {
        error.errorId = generateId();
        return error;
    },

    // Custom handlers
    onError: async (error, context) => {
        // Custom logic
    },
    beforeLog: async (error, context) => {
        // Before logging
    },
    afterLog: async (error, context) => {
        // After logging
    },

    // Monitoring
    reportToMonitoring: true,
    monitoringService: async (error, context) => {
        // Sentry, DataDog, etc.
    },

    // Notifications
    notifyOnError: true,
    notificationService: async (error, context) => {
        // Slack, email, etc.
    },
    notifyOnStatusCodes: [500, 502, 503],

    // Security
    sanitizeErrorMessages: true,
    exposeSensitiveData: false,

    // Recovery
    attemptRecovery: true,
    recoveryStrategies: []
});
```

### With Express

```javascript
const { createGlobalErrorHandler, createExpressMiddleware } = require('my-utils/src/error');
const { createExpressApp } = require('my-utils/src/express');

const app = createExpressApp();
const errorHandler = createGlobalErrorHandler({
    environment: 'production'
});

// Your routes here
app.get('/api/users', ...);

// Apply global error handler (must be last)
app.use(createExpressMiddleware(errorHandler));
```

### With Lambda

```javascript
const { createGlobalErrorHandler, createLambdaHandler } = require('my-utils/src/error');

const errorHandler = createGlobalErrorHandler({
    environment: 'production',
    reportToMonitoring: true
});

exports.handler = async (event, context) => {
    try {
        // Your logic
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (error) {
        const handler = createLambdaHandler(errorHandler);
        return await handler(error, event, context);
    }
};
```

## Recovery Strategies

### Retry Strategy

Automatically retry failed operations:

```javascript
const { strategies } = require('my-utils/src/error');

const handler = createGlobalErrorHandler({
    attemptRecovery: true,
    recoveryStrategies: [
        strategies.retryStrategy({
            maxRetries: 3,
            delayMs: 1000,
            exponentialBackoff: true,
            retryableErrors: ['ETIMEDOUT', 'ECONNRESET']
        })
    ]
});
```

### Fallback Strategy

Return fallback value on error:

```javascript
strategies.fallbackStrategy({
    data: [],
    message: 'Using cached data'
})

// Or with function
strategies.fallbackStrategy(async (error, context) => {
    return await getCachedData();
})
```

### Circuit Breaker Strategy

Prevent cascading failures:

```javascript
strategies.circuitBreakerStrategy({
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    halfOpenRetries: 1
})
```

### Cache Strategy

Return cached value on error:

```javascript
strategies.cacheStrategy({
    get: async (key) => {
        return await redis.get(key);
    }
})
```

### Default Value Strategy

Return default values for specific errors:

```javascript
strategies.defaultValueStrategy({
    'NotFoundError': [],
    'ValidationError': { valid: false, errors: [] },
    'TimeoutError': null
})
```

### Graceful Degradation

Return partial results:

```javascript
strategies.gracefulDegradationStrategy(
    async (error, context) => {
        // Return partial data
        return { data: partialResults, partial: true };
    }
)
```

### Compose Strategies

Chain multiple strategies:

```javascript
strategies.composeStrategies(
    strategies.retryStrategy({ maxRetries: 2 }),
    strategies.cacheStrategy(cache),
    strategies.fallbackStrategy({ data: null })
)
```

## Integration Examples

### Complete Express Example

```javascript
const { createExpressApp } = require('my-utils/src/express');
const { 
    createGlobalErrorHandler, 
    createExpressMiddleware,
    strategies 
} = require('my-utils/src/error');

const app = createExpressApp();

const errorHandler = createGlobalErrorHandler({
    environment: 'production',
    
    // Monitoring
    reportToMonitoring: true,
    monitoringService: async (error, context) => {
        await sentry.captureException(error, { contexts: context });
    },
    
    // Notifications
    notifyOnError: true,
    notifyOnStatusCodes: [500, 502, 503],
    notificationService: async (error, context) => {
        await slack.sendMessage({
            channel: '#alerts',
            text: `Error: ${error.message}`
        });
    },
    
    // Recovery
    attemptRecovery: true,
    recoveryStrategies: [
        strategies.retryStrategy({ maxRetries: 2 }),
        strategies.cacheStrategy(redisCache),
        strategies.fallbackStrategy({ data: [] })
    ]
});

// Routes
app.get('/api/users', async (req, res) => {
    const users = await db.getUsers();
    res.json({ success: true, data: users });
});

// Apply error handler
app.use(createExpressMiddleware(errorHandler));

app.listen(3000);
```

### Error Statistics

```javascript
// Get error statistics
const stats = errorHandler.getStats();
console.log(stats);
// {
//   total: 150,
//   byType: { NotFoundError: 50, ValidationError: 100 },
//   byStatusCode: { 404: 50, 400: 100 },
//   recent: [...],
//   uptime: 3600,
//   timestamp: '2024-01-01T00:00:00Z'
// }

// Reset statistics
errorHandler.resetStats();
```

### Custom Error Transformation

```javascript
const handler = createGlobalErrorHandler({
    transformError: async (error, context) => {
        // Add custom properties
        error.errorId = generateErrorId();
        error.service = 'api-server';
        error.version = process.env.APP_VERSION;
        error.userId = context.userId;
        
        // Mask sensitive data
        if (error.message.includes('password')) {
            error.message = 'Authentication failed';
        }
        
        return error;
    }
});
```

### Before/After Hooks

```javascript
const handler = createGlobalErrorHandler({
    beforeLog: async (error, context) => {
        // Execute before logging
        console.log('Processing error...');
        await incrementErrorCounter();
    },
    
    afterLog: async (error, context) => {
        // Execute after logging
        console.log('Error logged successfully');
        await updateDashboard();
    },
    
    onError: async (error, context) => {
        // Custom error handling logic
        if (error.statusCode >= 500) {
            await alertOncallEngineer();
        }
    }
});
```

## Best Practices

### 1. Use Specific Error Classes

```javascript
// ❌ Bad
throw new Error('User not found');

// ✅ Good
throw new NotFoundError('User');
```

### 2. Include Error Context

```javascript
// ❌ Bad
throw new ValidationError('Validation failed');

// ✅ Good
throw new ValidationError('Email validation failed', {
    field: 'email',
    value: userInput,
    reason: 'Invalid format'
});
```

### 3. Sanitize Errors in Production

```javascript
const handler = createGlobalErrorHandler({
    environment: 'production',
    sanitizeErrorMessages: true,
    includeStackTrace: false
});
```

### 4. Implement Recovery Strategies

```javascript
// Use appropriate recovery for your use case
recoveryStrategies: [
    strategies.retryStrategy({ maxRetries: 3 }), // For transient failures
    strategies.cacheStrategy(cache),              // For data availability
    strategies.fallbackStrategy(defaultValue)     // For graceful degradation
]
```

### 5. Monitor and Alert

```javascript
const handler = createGlobalErrorHandler({
    reportToMonitoring: true,
    monitoringService: sentryReport,
    notifyOnError: true,
    notificationService: slackAlert,
    notifyOnStatusCodes: [500, 502, 503]
});
```

### 6. Track Error Statistics

```javascript
// Monitor error trends
app.get('/health', (req, res) => {
    const stats = errorHandler.getStats();
    res.json({ health: 'ok', errors: stats });
});
```

### 7. Use Async Error Handlers

```javascript
const { wrapAsync } = require('my-utils/src/error');

const myFunction = wrapAsync(async () => {
    // Your async code
}, errorHandler);
```

## See Also

- [Router Guide](./ROUTER.md)
- [Express Guide](./EXPRESS.md)
- [Validation Guide](./VALIDATION.md)
- [Examples](../examples/global-error-handler.js)
