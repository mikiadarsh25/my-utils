/**
 * Complete Lambda API Example
 * Full-featured REST API with router, validation, auth, and error handling
 */

const { createRouter, corsMiddleware, requestLoggerMiddleware } = require('../src/router');
const { validateBody, validateParams, validateQuery, Joi } = require('../src/validation');
const { createLogger } = require('../src/logger');
const { NotFoundError, ValidationError, AuthorizationError } = require('../src/error');
const { getCurrentTimestamp } = require('../src/date');

// Initialize router with options
const app = createRouter({
    cors: true,
    logger: createLogger({ service: 'user-api' })
});

// Global middlewares
app.use(corsMiddleware());
app.use(requestLoggerMiddleware());

// ========================================
// Validation Schemas
// ========================================

const schemas = {
    createUser: Joi.object({
        email: Joi.string().email().required(),
        firstName: Joi.string().min(2).max(50).required(),
        lastName: Joi.string().min(2).max(50).required(),
        phone: Joi.string().pattern(/^\+?[\d\s\-()]{10,}$/).optional(),
        role: Joi.string().valid('user', 'admin', 'manager').default('user')
    }),

    updateUser: Joi.object({
        firstName: Joi.string().min(2).max(50).optional(),
        lastName: Joi.string().min(2).max(50).optional(),
        phone: Joi.string().pattern(/^\+?[\d\s\-()]{10,}$/).optional(),
        bio: Joi.string().max(500).optional()
    }).min(1),

    userId: Joi.object({
        id: Joi.string().uuid().required()
    }),

    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        sortBy: Joi.string().valid('createdAt', 'email', 'firstName').default('createdAt'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
        search: Joi.string().min(1).optional()
    })
};

// ========================================
// Authentication Middleware
// ========================================

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers?.Authorization || req.headers?.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthorizationError('Missing or invalid authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    try {
        // In production, verify JWT token here
        // const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Mock user for example
        req.user = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'user@example.com',
            role: 'admin'
        };

        await next();
    } catch (error) {
        throw new AuthorizationError('Invalid token');
    }
};

// Permission check middleware
const requireRole = (allowedRoles) => {
    return async (req, res, next) => {
        if (!allowedRoles.includes(req.user.role)) {
            throw new AuthorizationError('Insufficient permissions');
        }
        await next();
    };
};

// ========================================
// Mock Database
// ========================================

const db = {
    users: [
        {
            id: '123e4567-e89b-12d3-a456-426614174001',
            email: 'john@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'user',
            createdAt: '2024-01-01T00:00:00Z'
        },
        {
            id: '123e4567-e89b-12d3-a456-426614174002',
            email: 'jane@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
            role: 'admin',
            createdAt: '2024-01-02T00:00:00Z'
        }
    ],

    findById(id) {
        return this.users.find(u => u.id === id);
    },

    findByEmail(email) {
        return this.users.find(u => u.email === email);
    },

    create(userData) {
        const user = {
            id: `123e4567-e89b-12d3-a456-${Date.now()}`,
            ...userData,
            createdAt: getCurrentTimestamp()
        };
        this.users.push(user);
        return user;
    },

    update(id, updates) {
        const index = this.users.findIndex(u => u.id === id);
        if (index === -1) return null;
        
        this.users[index] = {
            ...this.users[index],
            ...updates,
            updatedAt: getCurrentTimestamp()
        };
        return this.users[index];
    },

    delete(id) {
        const index = this.users.findIndex(u => u.id === id);
        if (index === -1) return false;
        
        this.users.splice(index, 1);
        return true;
    },

    list({ page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search = '' }) {
        let filtered = this.users;

        // Search
        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(u =>
                u.email.toLowerCase().includes(searchLower) ||
                u.firstName.toLowerCase().includes(searchLower) ||
                u.lastName.toLowerCase().includes(searchLower)
            );
        }

        // Sort
        filtered.sort((a, b) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];
            const order = sortOrder === 'asc' ? 1 : -1;
            return aVal > bVal ? order : -order;
        });

        // Paginate
        const total = filtered.length;
        const start = (page - 1) * limit;
        const items = filtered.slice(start, start + limit);

        return {
            items,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        };
    }
};

// ========================================
// Public Routes
// ========================================

// Health check
app.get('/health', async (req, res) => {
    res.json({
        success: true,
        message: 'Service is healthy',
        timestamp: getCurrentTimestamp()
    });
});

// API info
app.get('/', async (req, res) => {
    res.json({
        success: true,
        service: 'User API',
        version: '1.0.0',
        endpoints: {
            'GET /health': 'Health check',
            'GET /users': 'List users (protected)',
            'GET /users/:id': 'Get user by ID (protected)',
            'POST /users': 'Create user (admin only)',
            'PATCH /users/:id': 'Update user (protected)',
            'DELETE /users/:id': 'Delete user (admin only)'
        }
    });
});

// ========================================
// Protected Routes - User Management
// ========================================

// List users with pagination
app.get('/users',
    authMiddleware,
    validateQuery(schemas.pagination),
    async (req, res) => {
        const { page, limit, sortBy, sortOrder, search } = req.queryStringParameters;
        
        const result = db.list({
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy,
            sortOrder,
            search
        });

        res.json({
            success: true,
            data: result.items,
            meta: result.meta
        });
    }
);

// Get user by ID
app.get('/users/:id',
    authMiddleware,
    validateParams(schemas.userId),
    async (req, res) => {
        const { id } = req.params;
        const user = db.findById(id);

        if (!user) {
            throw new NotFoundError('User');
        }

        res.json({
            success: true,
            data: user
        });
    }
);

// Create user (admin only)
app.post('/users',
    authMiddleware,
    requireRole(['admin']),
    validateBody(schemas.createUser),
    async (req, res) => {
        const userData = req.body;

        // Check if email already exists
        if (db.findByEmail(userData.email)) {
            throw new ValidationError('Email already exists');
        }

        const user = db.create(userData);

        res.status(201).json({
            success: true,
            data: user,
            message: 'User created successfully'
        });
    }
);

// Update user
app.patch('/users/:id',
    authMiddleware,
    validateParams(schemas.userId),
    validateBody(schemas.updateUser),
    async (req, res) => {
        const { id } = req.params;
        const updates = req.body;

        // Users can only update their own profile (unless admin)
        if (req.user.role !== 'admin' && req.user.id !== id) {
            throw new AuthorizationError('You can only update your own profile');
        }

        const user = db.update(id, updates);

        if (!user) {
            throw new NotFoundError('User');
        }

        res.json({
            success: true,
            data: user,
            message: 'User updated successfully'
        });
    }
);

// Delete user (admin only)
app.delete('/users/:id',
    authMiddleware,
    requireRole(['admin']),
    validateParams(schemas.userId),
    async (req, res) => {
        const { id } = req.params;

        const deleted = db.delete(id);

        if (!deleted) {
            throw new NotFoundError('User');
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    }
);

// ========================================
// Export Lambda Handler
// ========================================

exports.handler = app.lambda();

// For local testing
if (require.main === module) {
    console.log('✅ Complete API example loaded');
    console.log('📝 This demonstrates:');
    console.log('   - Router with path parameters');
    console.log('   - Joi validation (body, query, params)');
    console.log('   - Authentication middleware');
    console.log('   - Role-based access control');
    console.log('   - CRUD operations');
    console.log('   - Pagination and search');
    console.log('   - Error handling');
    console.log('   - Mock database');
}
