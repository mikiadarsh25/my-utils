/**
 * Express Full API Example
 * Complete REST API with authentication, validation, and all features
 */

const { createExpressApp, errorHandler, notFoundHandler, asyncHandler, startServer } = require('../src/express');
const { validateBody, validateQuery, Joi } = require('../src/validation');
const { createLogger } = require('../src/logger');
const { NotFoundError, ValidationError, AuthorizationError } = require('../src/error');
const { getCurrentTimestamp } = require('../src/date');
const { hashSHA256, generateToken } = require('../src/security');

// Create Express app
const app = createExpressApp({
    cors: true,
    json: true,
    logging: true,
    logger: createLogger({ service: 'api-server' })
});

// ========================================
// Mock Database
// ========================================

const db = {
    users: [
        {
            id: '1',
            email: 'admin@example.com',
            password: hashSHA256('admin123'),
            name: 'Admin User',
            role: 'admin',
            createdAt: '2024-01-01T00:00:00Z'
        },
        {
            id: '2',
            email: 'user@example.com',
            password: hashSHA256('user123'),
            name: 'Regular User',
            role: 'user',
            createdAt: '2024-01-02T00:00:00Z'
        }
    ],

    sessions: {},

    findUserByEmail(email) {
        return this.users.find(u => u.email === email);
    },

    findUserById(id) {
        return this.users.find(u => u.id === id);
    },

    createSession(userId) {
        const token = generateToken(32);
        this.sessions[token] = {
            userId,
            createdAt: Date.now()
        };
        return token;
    },

    getSession(token) {
        return this.sessions[token];
    },

    deleteSession(token) {
        delete this.sessions[token];
    }
};

// ========================================
// Middleware
// ========================================

// Authentication middleware
const authMiddleware = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthorizationError('Missing or invalid authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const session = db.getSession(token);

    if (!session) {
        throw new AuthorizationError('Invalid or expired token');
    }

    const user = db.findUserById(session.userId);
    if (!user) {
        throw new AuthorizationError('User not found');
    }

    // Attach user to request
    req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
    };

    next();
});

// Role-based access control
const requireRole = (...roles) => {
    return asyncHandler(async (req, res, next) => {
        if (!req.user) {
            throw new AuthorizationError('Authentication required');
        }

        if (!roles.includes(req.user.role)) {
            throw new AuthorizationError('Insufficient permissions');
        }

        next();
    });
};

// ========================================
// Schemas
// ========================================

const schemas = {
    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),

    register: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        name: Joi.string().min(2).max(50).required()
    }),

    updateProfile: Joi.object({
        name: Joi.string().min(2).max(50).optional(),
        email: Joi.string().email().optional()
    }).min(1),

    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        search: Joi.string().optional()
    })
};

// ========================================
// Public Routes
// ========================================

app.get('/', (req, res) => {
    res.json({
        success: true,
        service: 'adevUtils Express API',
        version: '1.0.0',
        documentation: '/api/docs'
    });
});

app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: getCurrentTimestamp()
    });
});

// ========================================
// Auth Routes
// ========================================

// Login
app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const { validate } = require('../src/validation');
    const credentials = validate(req.body, schemas.login);

    const user = db.findUserByEmail(credentials.email);

    if (!user || user.password !== hashSHA256(credentials.password)) {
        throw new ValidationError('Invalid email or password');
    }

    const token = db.createSession(user.id);

    res.json({
        success: true,
        data: {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        },
        message: 'Login successful'
    });
}));

// Register
app.post('/api/auth/register', asyncHandler(async (req, res) => {
    const { validate } = require('../src/validation');
    const userData = validate(req.body, schemas.register);

    if (db.findUserByEmail(userData.email)) {
        throw new ValidationError('Email already exists');
    }

    const user = {
        id: String(db.users.length + 1),
        email: userData.email,
        password: hashSHA256(userData.password),
        name: userData.name,
        role: 'user',
        createdAt: getCurrentTimestamp()
    };

    db.users.push(user);

    res.status(201).json({
        success: true,
        data: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        },
        message: 'Registration successful'
    });
}));

// Logout
app.post('/api/auth/logout', authMiddleware, asyncHandler(async (req, res) => {
    const token = req.headers.authorization.replace('Bearer ', '');
    db.deleteSession(token);

    res.json({
        success: true,
        message: 'Logout successful'
    });
}));

// ========================================
// Protected Routes
// ========================================

// Get current user profile
app.get('/api/profile', authMiddleware, (req, res) => {
    res.json({
        success: true,
        data: req.user
    });
});

// Update profile
app.patch('/api/profile', authMiddleware, asyncHandler(async (req, res) => {
    const { validate } = require('../src/validation');
    const updates = validate(req.body, schemas.updateProfile);

    const userIndex = db.users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
        throw new NotFoundError('User');
    }

    db.users[userIndex] = {
        ...db.users[userIndex],
        ...updates,
        updatedAt: getCurrentTimestamp()
    };

    res.json({
        success: true,
        data: db.users[userIndex],
        message: 'Profile updated successfully'
    });
}));

// ========================================
// Admin Routes
// ========================================

// List all users (admin only)
app.get('/api/admin/users',
    authMiddleware,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
        const { validate } = require('../src/validation');
        const query = validate(req.query, schemas.pagination);

        let filteredUsers = db.users;

        // Search
        if (query.search) {
            const searchLower = query.search.toLowerCase();
            filteredUsers = filteredUsers.filter(u =>
                u.email.toLowerCase().includes(searchLower) ||
                u.name.toLowerCase().includes(searchLower)
            );
        }

        // Pagination
        const total = filteredUsers.length;
        const start = (query.page - 1) * query.limit;
        const items = filteredUsers.slice(start, start + query.limit);

        res.json({
            success: true,
            data: items.map(({ password, ...user }) => user),
            meta: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.ceil(total / query.limit)
            }
        });
    })
);

// Delete user (admin only)
app.delete('/api/admin/users/:id',
    authMiddleware,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Can't delete yourself
        if (id === req.user.id) {
            throw new ValidationError('Cannot delete your own account');
        }

        const index = db.users.findIndex(u => u.id === id);
        if (index === -1) {
            throw new NotFoundError('User');
        }

        db.users.splice(index, 1);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    })
);

// ========================================
// API Documentation
// ========================================

app.get('/api/docs', (req, res) => {
    res.json({
        success: true,
        endpoints: {
            public: {
                'GET /': 'API information',
                'GET /health': 'Health check',
                'POST /api/auth/login': 'Login',
                'POST /api/auth/register': 'Register'
            },
            protected: {
                'POST /api/auth/logout': 'Logout (requires auth)',
                'GET /api/profile': 'Get profile (requires auth)',
                'PATCH /api/profile': 'Update profile (requires auth)'
            },
            admin: {
                'GET /api/admin/users': 'List users (admin only)',
                'DELETE /api/admin/users/:id': 'Delete user (admin only)'
            }
        },
        authentication: {
            type: 'Bearer Token',
            header: 'Authorization: Bearer <token>',
            testCredentials: {
                admin: { email: 'admin@example.com', password: 'admin123' },
                user: { email: 'user@example.com', password: 'user123' }
            }
        }
    });
});

// ========================================
// Error Handlers
// ========================================

app.use(notFoundHandler());
app.use(errorHandler({ includeStack: true }));

// ========================================
// Start Server
// ========================================

const PORT = process.env.PORT || 3000;

startServer(app, PORT);

console.log('\n📋 Test the API:');
console.log('\n1. Login:');
console.log('   curl -X POST http://localhost:3000/api/auth/login \\');
console.log('     -H "Content-Type: application/json" \\');
console.log('     -d \'{"email":"admin@example.com","password":"admin123"}\'');
console.log('\n2. Get Profile (use token from login):');
console.log('   curl http://localhost:3000/api/profile \\');
console.log('     -H "Authorization: Bearer <your-token>"');
console.log('\n3. List Users (admin only):');
console.log('   curl http://localhost:3000/api/admin/users \\');
console.log('     -H "Authorization: Bearer <your-token>"');
