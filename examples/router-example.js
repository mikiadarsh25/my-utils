/**
 * Lambda Router Examples
 * Demonstrates how to use the router and validation modules
 */

const { router, validation, error } = require('../index');
const { createRouter, corsMiddleware, requestLoggerMiddleware } = router;
const { Joi, validateBody, validateParams, validateQuery, schemaBuilders } = validation;

// ========================================
// Example 1: Basic Router Setup
// ========================================

const app = createRouter({
    cors: true,
    logger: require('../src/logger').createLogger({ service: 'api' })
});

// Global middlewares
app.use(corsMiddleware());
app.use(requestLoggerMiddleware());

// ========================================
// Example 2: Simple Routes
// ========================================

// GET route
app.get('/health', async (req, res, next) => {
    res.json({
        success: true,
        message: 'Service is healthy',
        timestamp: new Date().toISOString()
    });
});

// POST route with manual validation
app.post('/users', async (req, res, next) => {
    const { email, name } = req.body;

    if (!email || !name) {
        throw new error.ValidationError('Email and name are required');
    }

    // Your business logic
    const user = { id: '123', email, name };

    res.status(201).json({
        success: true,
        data: user
    });
});

// ========================================
// Example 3: Routes with Path Parameters
// ========================================

app.get('/users/:id', async (req, res, next) => {
    const { id } = req.params;

    // Your business logic to fetch user
    const user = { id, name: 'John Doe', email: 'john@example.com' };

    res.json({
        success: true,
        data: user
    });
});

app.delete('/users/:id', async (req, res, next) => {
    const { id } = req.params;

    // Your business logic to delete user
    res.json({
        success: true,
        message: `User ${id} deleted successfully`
    });
});

// ========================================
// Example 4: Routes with Joi Validation
// ========================================

// User registration with schema validation
const registrationSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(2).required(),
    lastName: Joi.string().min(2).required(),
    phone: Joi.string().pattern(/^\+?[\d\s\-()]{10,}$/).optional()
});

app.post(
    '/auth/register',
    validateBody(registrationSchema),
    async (req, res, next) => {
        // req.body is now validated and sanitized
        const { email, firstName, lastName } = req.body;

        // Your business logic
        const user = {
            id: '123',
            email,
            firstName,
            lastName,
            createdAt: new Date().toISOString()
        };

        res.status(201).json({
            success: true,
            data: user
        });
    }
);

// User login
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

app.post(
    '/auth/login',
    validateBody(loginSchema),
    async (req, res, next) => {
        const { email, password } = req.body;

        // Your authentication logic
        const token = 'jwt-token-here';

        res.json({
            success: true,
            data: { token, email }
        });
    }
);

// ========================================
// Example 5: Query Parameter Validation
// ========================================

const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('name', 'email', 'createdAt').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    search: Joi.string().optional()
});

app.get(
    '/users',
    validateQuery(paginationSchema),
    async (req, res, next) => {
        const { page, limit, sortBy, sortOrder, search } = req.queryStringParameters;

        // Your business logic to fetch paginated users
        const users = [
            { id: '1', name: 'John Doe', email: 'john@example.com' },
            { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
        ];

        res.json({
            success: true,
            data: users,
            meta: {
                page,
                limit,
                total: 100,
                totalPages: 10
            }
        });
    }
);

// ========================================
// Example 6: Path Parameter Validation
// ========================================

const userIdSchema = Joi.object({
    id: Joi.string().uuid().required()
});

app.get(
    '/users/:id/profile',
    validateParams(userIdSchema),
    async (req, res, next) => {
        const { id } = req.params;

        // Your business logic
        const profile = {
            id,
            bio: 'Software developer',
            location: 'San Francisco',
            website: 'https://example.com'
        };

        res.json({
            success: true,
            data: profile
        });
    }
);

// ========================================
// Example 7: Update User with Partial Validation
// ========================================

const updateUserSchema = Joi.object({
    firstName: Joi.string().min(2).optional(),
    lastName: Joi.string().min(2).optional(),
    phone: Joi.string().pattern(/^\+?[\d\s\-()]{10,}$/).optional(),
    bio: Joi.string().max(500).optional()
}).min(1); // At least one field must be provided

app.patch(
    '/users/:id',
    validateParams(userIdSchema),
    validateBody(updateUserSchema),
    async (req, res, next) => {
        const { id } = req.params;
        const updates = req.body;

        // Your business logic to update user
        const updatedUser = {
            id,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        res.json({
            success: true,
            data: updatedUser
        });
    }
);

// ========================================
// Example 8: Complex Nested Schema
// ========================================

const createOrderSchema = Joi.object({
    customerId: Joi.string().uuid().required(),
    items: Joi.array().items(
        Joi.object({
            productId: Joi.string().uuid().required(),
            quantity: Joi.number().integer().min(1).required(),
            price: Joi.number().positive().required()
        })
    ).min(1).required(),
    shippingAddress: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        zipCode: Joi.string().pattern(/^\d{5}(-\d{4})?$/).required(),
        country: Joi.string().length(2).required()
    }).required(),
    paymentMethod: Joi.string().valid('credit_card', 'paypal', 'bank_transfer').required()
});

app.post(
    '/orders',
    validateBody(createOrderSchema),
    async (req, res, next) => {
        const orderData = req.body;

        // Your business logic
        const order = {
            id: '123',
            ...orderData,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        res.status(201).json({
            success: true,
            data: order
        });
    }
);

// ========================================
// Example 9: Using Pre-built Schema Builders
// ========================================

app.post(
    '/auth/signup',
    validateBody(schemaBuilders.userRegistration()),
    async (req, res, next) => {
        const userData = req.body;

        // Your business logic
        res.status(201).json({
            success: true,
            message: 'User registered successfully'
        });
    }
);

// ========================================
// Example 10: Custom Error Handling
// ========================================

const appWithCustomErrors = createRouter({
    errorHandler: (error, req) => {
        console.error('Custom error handler:', error);

        if (error instanceof error.ValidationError) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    error: error.message,
                    details: error.details,
                    timestamp: new Date().toISOString()
                })
            };
        }

        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            })
        };
    }
});

// ========================================
// Example 11: Authentication Middleware
// ========================================

const authMiddleware = async (req, res, next) => {
    const token = req.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
        throw new error.AuthenticationError('Missing authentication token');
    }

    // Your token verification logic
    try {
        // const decoded = verifyToken(token);
        req.user = { id: '123', email: 'user@example.com' };
        await next();
    } catch (err) {
        throw new error.AuthenticationError('Invalid token');
    }
};

// Protected route
app.get('/profile', authMiddleware, async (req, res, next) => {
    res.json({
        success: true,
        data: req.user
    });
});

// ========================================
// Example 12: Multiple Middlewares
// ========================================

const checkPermission = (permission) => {
    return async (req, res, next) => {
        if (!req.user || !req.user.permissions?.includes(permission)) {
            throw new error.AuthorizationError('Insufficient permissions');
        }
        await next();
    };
};

app.delete(
    '/users/:id',
    authMiddleware,
    checkPermission('delete:users'),
    validateParams(userIdSchema),
    async (req, res, next) => {
        const { id } = req.params;

        // Your business logic
        res.json({
            success: true,
            message: `User ${id} deleted successfully`
        });
    }
);

// ========================================
// Export Lambda Handler
// ========================================

// Export the handler for AWS Lambda
exports.handler = app.lambda();

// Or manually handle
exports.manualHandler = async (event, context) => {
    return await app.handle(event, context);
};

console.log('✅ Router examples loaded successfully!');
console.log('📝 See the code for various usage patterns');
