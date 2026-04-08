# Lambda Router Guide

A powerful Express-style routing system for AWS Lambda with middleware support and automatic validation.

## Table of Contents
- [Quick Start](#quick-start)
- [Basic Routing](#basic-routing)
- [Path Parameters](#path-parameters)
- [Middleware](#middleware)
- [Validation](#validation)
- [Error Handling](#error-handling)
- [Complete Examples](#complete-examples)

## Quick Start

```javascript
const { createRouter } = require('adev-utils/src/router');

const app = createRouter();

app.get('/health', async (req, res) => {
    res.json({ success: true, message: 'OK' });
});

exports.handler = app.lambda();
```

## Basic Routing

### HTTP Methods

```javascript
const app = createRouter();

// GET route
app.get('/users', async (req, res) => {
    res.json({ success: true, data: users });
});

// POST route
app.post('/users', async (req, res) => {
    const user = req.body;
    res.status(201).json({ success: true, data: user });
});

// PUT route
app.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    res.json({ success: true, message: `Updated user ${id}` });
});

// PATCH route
app.patch('/users/:id', async (req, res) => {
    res.json({ success: true });
});

// DELETE route
app.delete('/users/:id', async (req, res) => {
    res.json({ success: true });
});

// All methods
app.all('/status', async (req, res) => {
    res.json({ method: req.method });
});
```

## Path Parameters

Extract dynamic values from URL paths:

```javascript
// Single parameter
app.get('/users/:id', async (req, res) => {
    const { id } = req.params;
    res.json({ userId: id });
});

// Multiple parameters
app.get('/users/:userId/posts/:postId', async (req, res) => {
    const { userId, postId } = req.params;
    res.json({ userId, postId });
});

// With validation
app.get('/users/:id', 
    validateParams(Joi.object({ 
        id: Joi.string().uuid() 
    })),
    async (req, res) => {
        // req.params.id is now validated as UUID
    }
);
```

## Middleware

### Global Middleware

Runs on all routes:

```javascript
const app = createRouter();

// CORS
app.use(corsMiddleware());

// Request logging
app.use(requestLoggerMiddleware());

// Custom middleware
app.use(async (req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    await next();
});
```

### Route-Specific Middleware

Runs only on specific routes:

```javascript
// Single middleware
app.get('/protected', authMiddleware, async (req, res) => {
    res.json({ user: req.user });
});

// Multiple middlewares
app.post('/admin/users',
    authMiddleware,
    checkAdminRole,
    validateBody(userSchema),
    async (req, res) => {
        // All middlewares passed
    }
);
```

### Built-in Middlewares

#### CORS Middleware
```javascript
const { corsMiddleware } = require('adev-utils/src/router');

app.use(corsMiddleware({
    origin: '*',
    methods: 'GET,POST,PUT,DELETE',
    headers: 'Content-Type,Authorization'
}));
```

#### Request Logger
```javascript
const { requestLoggerMiddleware } = require('adev-utils/src/router');
const { createLogger } = require('adev-utils/src/logger');

const logger = createLogger({ service: 'api' });
app.use(requestLoggerMiddleware(logger));
```

#### Authentication
```javascript
const { authMiddleware } = require('adev-utils/src/router');

app.use(authMiddleware({
    validate: async (token) => {
        // Your token validation logic
        return { id: '123', email: 'user@example.com' };
    }
}));
```

### Custom Middleware

```javascript
// Rate limiting
const rateLimitMiddleware = () => {
    return async (req, res, next) => {
        const ip = req.requestContext.identity.sourceIp;
        // Check rate limit
        if (isRateLimited(ip)) {
            throw new Error('Rate limit exceeded');
        }
        await next();
    };
};

// Permission check
const requirePermission = (permission) => {
    return async (req, res, next) => {
        if (!req.user?.permissions?.includes(permission)) {
            throw new error.AuthorizationError();
        }
        await next();
    };
};

// Usage
app.post('/users', 
    rateLimitMiddleware(),
    requirePermission('create:users'),
    async (req, res) => {
        // Handler
    }
);
```

## Validation

### Using Joi Schemas

```javascript
const { Joi, validateBody, validateQuery, validateParams } = require('adev-utils/src/validation');

// Validate request body
const createUserSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().min(2).required()
});

app.post('/users', 
    validateBody(createUserSchema),
    async (req, res) => {
        // req.body is validated and sanitized
        const user = req.body;
        res.status(201).json({ success: true, data: user });
    }
);

// Validate query parameters
const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
});

app.get('/users',
    validateQuery(paginationSchema),
    async (req, res) => {
        const { page, limit } = req.queryStringParameters;
        // Fetch paginated users
    }
);

// Validate path parameters
const idSchema = Joi.object({
    id: Joi.string().uuid().required()
});

app.get('/users/:id',
    validateParams(idSchema),
    async (req, res) => {
        const { id } = req.params; // Validated UUID
    }
);
```

### Pre-built Schema Builders

```javascript
const { schemaBuilders } = require('adev-utils/src/validation');

// User registration
app.post('/auth/register',
    validateBody(schemaBuilders.userRegistration()),
    async (req, res) => {
        // req.body has email, password, firstName, lastName validated
    }
);

// User login
app.post('/auth/login',
    validateBody(schemaBuilders.userLogin()),
    async (req, res) => {
        // req.body has email, password validated
    }
);

// Pagination
app.get('/posts',
    validateQuery(schemaBuilders.paginationQuery()),
    async (req, res) => {
        // Query params validated with sorting and pagination
    }
);
```

## Error Handling

### Automatic Error Handling

Errors thrown in handlers/middlewares are automatically caught:

```javascript
const { ValidationError, NotFoundError } = require('adev-utils/src/error');

app.get('/users/:id', async (req, res) => {
    const user = await findUser(req.params.id);
    
    if (!user) {
        throw new NotFoundError('User');
    }
    
    res.json({ success: true, data: user });
});

// Validation errors from Joi are automatically formatted
app.post('/users',
    validateBody(userSchema),
    async (req, res) => {
        // If validation fails, proper error response is sent
    }
);
```

### Custom Error Handler

```javascript
const app = createRouter({
    errorHandler: (error, req) => {
        console.error('Error:', error);
        
        // Custom error response
        return {
            statusCode: error.statusCode || 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            })
        };
    }
});
```

## Request and Response Objects

### Request Object (req)

```javascript
app.post('/example', async (req, res) => {
    // Original Lambda event
    req.event
    
    // Lambda context
    req.context
    
    // Parsed body (JSON)
    req.body
    
    // Headers
    req.headers
    
    // Path parameters
    req.params
    
    // Query string parameters
    req.queryStringParameters
    
    // HTTP method
    req.method
    
    // Path
    req.path
    
    // Request ID
    req.requestId
    
    // Request context
    req.requestContext
    
    // User (if auth middleware is used)
    req.user
});
```

### Response Object (res)

```javascript
app.get('/example', async (req, res) => {
    // Send JSON response (default status 200)
    res.json({ success: true, data: {} });
    
    // Set status code
    res.status(201).json({ created: true });
    
    // Send with specific status
    res.send(404, { error: 'Not found' });
    
    // Set custom headers
    res.headers['X-Custom'] = 'value';
    res.json({ data: {} });
});
```

## Complete Examples

### REST API with CRUD Operations

```javascript
const { createRouter } = require('adev-utils/src/router');
const { validateBody, validateParams, Joi } = require('adev-utils/src/validation');
const { NotFoundError } = require('adev-utils/src/error');

const app = createRouter();

// Schemas
const userSchema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).required(),
    role: Joi.string().valid('user', 'admin').default('user')
});

const idSchema = Joi.object({
    id: Joi.string().uuid().required()
});

// Routes
app.get('/users', async (req, res) => {
    const users = await db.getUsers();
    res.json({ success: true, data: users });
});

app.get('/users/:id',
    validateParams(idSchema),
    async (req, res) => {
        const user = await db.getUserById(req.params.id);
        if (!user) throw new NotFoundError('User');
        res.json({ success: true, data: user });
    }
);

app.post('/users',
    validateBody(userSchema),
    async (req, res) => {
        const user = await db.createUser(req.body);
        res.status(201).json({ success: true, data: user });
    }
);

app.patch('/users/:id',
    validateParams(idSchema),
    validateBody(userSchema.fork(['email', 'name'], (schema) => schema.optional())),
    async (req, res) => {
        const user = await db.updateUser(req.params.id, req.body);
        if (!user) throw new NotFoundError('User');
        res.json({ success: true, data: user });
    }
);

app.delete('/users/:id',
    validateParams(idSchema),
    async (req, res) => {
        await db.deleteUser(req.params.id);
        res.json({ success: true, message: 'User deleted' });
    }
);

exports.handler = app.lambda();
```

### Protected API with Authentication

```javascript
const { createRouter, authMiddleware } = require('adev-utils/src/router');

const app = createRouter();

// Public routes
app.post('/auth/login', async (req, res) => {
    const token = await authenticate(req.body);
    res.json({ success: true, token });
});

// Protected routes
const auth = authMiddleware({
    validate: async (token) => {
        return await verifyToken(token);
    }
});

app.get('/profile', auth, async (req, res) => {
    res.json({ success: true, user: req.user });
});

app.put('/profile', auth, validateBody(profileSchema), async (req, res) => {
    const updated = await updateProfile(req.user.id, req.body);
    res.json({ success: true, data: updated });
});

exports.handler = app.lambda();
```

## Router Options

```javascript
const app = createRouter({
    // Enable/disable CORS (default: true)
    cors: true,
    
    // Custom logger
    logger: createLogger({ service: 'my-api' }),
    
    // Custom error handler
    errorHandler: (error, req) => {
        // Return Lambda response object
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
});
```

## Best Practices

1. **Use validation middlewares** - Always validate input data
2. **Handle errors properly** - Use custom error classes
3. **Add authentication** - Protect sensitive routes
4. **Log requests** - Use request logger middleware
5. **Enable CORS** - For API Gateway integration
6. **Keep handlers thin** - Move business logic to services
7. **Use async/await** - Cleaner error handling

## See Also

- [Validation Guide](./VALIDATION.md)
- [API Documentation](./API.md)
- [Examples](../examples/router-example.js)
