# Express Guide

Complete guide to using adevUtils with Express.js applications.

## Table of Contents
- [Quick Start](#quick-start)
- [Creating Express Apps](#creating-express-apps)
- [Unified Router](#unified-router)
- [Express Utilities](#express-utilities)
- [Response Helpers](#response-helpers)
- [Error Handling](#error-handling)
- [Complete Examples](#complete-examples)

## Quick Start

### Basic Express Server

```javascript
const { createExpressApp, errorHandler, notFoundHandler, startServer } = require('adev-utils/src/express');

const app = createExpressApp({
    cors: true,
    json: true,
    logging: true
});

app.get('/api/hello', (req, res) => {
    res.json({ success: true, message: 'Hello World!' });
});

app.use(notFoundHandler());
app.use(errorHandler());

startServer(app, 3000);
```

### Using Unified Router (Works for Both Lambda & Express)

```javascript
const { createRouter } = require('adev-utils/src/router');
const { createExpressApp, errorHandler, startServer } = require('adev-utils/src/express');

const app = createExpressApp();
const router = createRouter();

// Define routes once
router.get('/users', async (req, res) => {
    res.json({ success: true, data: [] });
});

router.post('/users', validateBody(schema), async (req, res) => {
    res.status(201).json({ success: true });
});

// Mount to Express
router.mountExpress(app, '/api');

app.use(errorHandler());
startServer(app, 3000);

// Same router works for Lambda!
// exports.handler = router.lambda();
```

## Creating Express Apps

### Basic Setup

```javascript
const { createExpressApp } = require('adev-utils/src/express');

const app = createExpressApp({
    // Body parsing
    json: true,                    // Enable JSON parsing (default: true)
    jsonOptions: { limit: '10mb' }, // JSON parser options
    
    urlencoded: true,              // Enable URL-encoded parsing (default: true)
    urlencodedOptions: { extended: true },
    
    // CORS
    cors: true,                    // Enable CORS (default: true)
    corsOptions: {
        origin: '*',
        methods: 'GET,POST,PUT,PATCH,DELETE',
        allowedHeaders: 'Content-Type,Authorization'
    },
    
    // Request ID
    requestId: true,               // Add X-Request-ID (default: true)
    
    // Logging
    logging: true,                 // Enable request logging (default: true)
    logger: createLogger({ service: 'my-api' })
});
```

### Manual Setup

```javascript
const express = require('express');
const app = express();

// Add middlewares manually
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add adevUtils error handling
const { errorHandler, notFoundHandler } = require('adev-utils/src/express');
app.use(notFoundHandler());
app.use(errorHandler());
```

## Unified Router

The unified router works seamlessly with both Lambda and Express!

### Define Routes Once

```javascript
const { createRouter } = require('adev-utils/src/router');
const { validateBody, Joi } = require('adev-utils/src/validation');

const router = createRouter();

const userSchema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).required()
});

// Define routes with validation
router.get('/users', async (req, res) => {
    const users = await db.getUsers();
    res.json({ success: true, data: users });
});

router.post('/users', validateBody(userSchema), async (req, res) => {
    const user = await db.createUser(req.body);
    res.status(201).json({ success: true, data: user });
});

router.get('/users/:id', async (req, res) => {
    const user = await db.getUser(req.params.id);
    res.json({ success: true, data: user });
});
```

### Use with Express

```javascript
const express = require('express');
const app = express();

// Mount router at base path
router.mountExpress(app, '/api');

// Routes are now available at:
// GET    /api/users
// POST   /api/users
// GET    /api/users/:id
```

### Use with Lambda

```javascript
// Same router, export for Lambda
exports.handler = router.lambda();
```

### Complete Example

```javascript
const { createRouter } = require('adev-utils/src/router');
const { createExpressApp, startServer, errorHandler } = require('adev-utils/src/express');

// Create router
const apiRouter = createRouter();

// Add routes
apiRouter.get('/health', async (req, res) => {
    res.json({ success: true, status: 'healthy' });
});

// For Express
const app = createExpressApp();
apiRouter.mountExpress(app, '/api');
app.use(errorHandler());
startServer(app, 3000);

// For Lambda (same routes!)
// exports.handler = apiRouter.lambda();
```

## Express Utilities

### Async Handler

Wraps async routes to catch errors:

```javascript
const { asyncHandler } = require('adev-utils/src/express');

app.get('/users', asyncHandler(async (req, res) => {
    const users = await db.getUsers(); // Errors automatically caught
    res.json({ success: true, data: users });
}));
```

### Lambda to Express Adapter

Convert Lambda handlers to Express middleware:

```javascript
const { lambdaToExpress } = require('adev-utils/src/express');

// Existing Lambda handler
const lambdaHandler = async (event, context) => {
    return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
    };
};

// Use in Express
app.get('/api/lambda-route', lambdaToExpress(lambdaHandler));
```

## Response Helpers

### Send Success

```javascript
const { sendSuccess } = require('adev-utils/src/express');

app.get('/users', (req, res) => {
    const users = [{ id: 1, name: 'John' }];
    sendSuccess(res, users, 200, 'Users retrieved successfully');
    // Response: { success: true, data: [...], message: '...' }
});
```

### Send Error

```javascript
const { sendError } = require('adev-utils/src/express');

app.get('/users/:id', (req, res) => {
    const user = db.findUser(req.params.id);
    if (!user) {
        return sendError(res, 'User not found', 404);
    }
    res.json({ success: true, data: user });
});
```

### Send Paginated

```javascript
const { sendPaginated } = require('adev-utils/src/express');

app.get('/users', (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const { items, total } = db.getUsers(page, limit);
    
    sendPaginated(res, items, page, limit, total);
    // Response includes pagination metadata
});
```

## Error Handling

### Error Handler Middleware

```javascript
const { errorHandler } = require('adev-utils/src/express');

// Add at the end of middleware chain
app.use(errorHandler({
    includeStack: process.env.NODE_ENV === 'development',
    logger: createLogger({ service: 'api' })
}));
```

### Not Found Handler

```javascript
const { notFoundHandler } = require('adev-utils/src/express');

// Add before error handler
app.use(notFoundHandler());
```

### Custom Error Classes

```javascript
const { NotFoundError, ValidationError, AuthorizationError } = require('adev-utils/src/error');

app.get('/users/:id', (req, res, next) => {
    const user = db.findUser(req.params.id);
    
    if (!user) {
        throw new NotFoundError('User'); // Automatically handled
    }
    
    res.json({ success: true, data: user });
});
```

### Complete Error Setup

```javascript
const { createExpressApp, errorHandler, notFoundHandler } = require('adev-utils/src/express');

const app = createExpressApp();

// Your routes here
app.get('/api/users', ...);

// Error handlers (MUST BE LAST)
app.use(notFoundHandler());
app.use(errorHandler({
    includeStack: true
}));
```

## Validation with Express

### Using Joi Validation

```javascript
const { validateBody, Joi } = require('adev-utils/src/validation');
const { asyncHandler } = require('adev-utils/src/express');

const userSchema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).required()
});

app.post('/users', asyncHandler(async (req, res) => {
    const { validate } = require('adev-utils/src/validation');
    const userData = validate(req.body, userSchema);
    
    const user = await db.createUser(userData);
    res.status(201).json({ success: true, data: user });
}));
```

### With Unified Router (Recommended)

```javascript
const { createRouter } = require('adev-utils/src/router');
const { validateBody } = require('adev-utils/src/validation');

const router = createRouter();

router.post('/users', validateBody(userSchema), async (req, res) => {
    // req.body is already validated
    const user = await db.createUser(req.body);
    res.status(201).json({ success: true, data: user });
});

router.mountExpress(app, '/api');
```

## Authentication

### Auth Middleware

```javascript
const { asyncHandler } = require('adev-utils/src/express');
const { AuthorizationError } = require('adev-utils/src/error');

const authMiddleware = asyncHandler(async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        throw new AuthorizationError('Missing token');
    }
    
    const user = await verifyToken(token);
    req.user = user;
    next();
});

// Use in routes
app.get('/profile', authMiddleware, (req, res) => {
    res.json({ success: true, data: req.user });
});
```

### Role-Based Access

```javascript
const requireRole = (...roles) => {
    return asyncHandler(async (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            throw new AuthorizationError('Insufficient permissions');
        }
        next();
    });
};

// Admin only route
app.delete('/users/:id',
    authMiddleware,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
        await db.deleteUser(req.params.id);
        res.json({ success: true });
    })
);
```

## Starting the Server

### Basic Start

```javascript
const { startServer } = require('adev-utils/src/express');

const PORT = process.env.PORT || 3000;
startServer(app, PORT);
```

### With Callback

```javascript
startServer(app, 3000, (server) => {
    console.log('Server started!');
    console.log('Environment:', process.env.NODE_ENV);
});
```

### Manual Start

```javascript
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Server closed');
    });
});
```

## Complete Examples

See the examples directory:
- `examples/express-basic.js` - Basic Express server
- `examples/express-with-router.js` - Using unified router
- `examples/express-full-api.js` - Complete API with auth

### Run Examples

```bash
# Install dependencies
npm install

# Run basic example
node examples/express-basic.js

# Run router example
node examples/express-with-router.js

# Run full API example
node examples/express-full-api.js
```

## Best Practices

1. **Use Unified Router** - Write routes once, deploy anywhere (Lambda or Express)
2. **Always add error handlers** - Add `notFoundHandler()` and `errorHandler()` last
3. **Use asyncHandler** - Wrap async routes to catch errors
4. **Validate input** - Always validate with Joi schemas
5. **Use custom errors** - Throw `NotFoundError`, `ValidationError`, etc.
6. **Enable CORS** - Configure CORS for API endpoints
7. **Add request logging** - Enable logging in production
8. **Use environment variables** - Configure via `process.env`

## See Also

- [Router Guide](./ROUTER.md) - Unified routing for Lambda & Express
- [Validation Guide](./VALIDATION.md) - Input validation with Joi
- [API Documentation](./API.md) - Complete API reference
- [Examples](../examples/) - Working code examples
