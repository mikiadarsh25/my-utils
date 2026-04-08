/**
 * Express with Router Example
 * Using the unified router for both Lambda and Express
 */

const express = require('express');
const { createRouter } = require('../src/router');
const { validateBody, validateParams, validateQuery, Joi } = require('../src/validation');
const { createExpressApp, errorHandler, notFoundHandler, startServer } = require('../src/express');
const { NotFoundError } = require('../src/error');

// Create Express app
const app = createExpressApp({
    cors: true,
    json: true,
    logging: true
});

// ========================================
// Create Unified Router
// ========================================

const apiRouter = createRouter();

// ========================================
// Schemas
// ========================================

const schemas = {
    createUser: Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().min(2).max(50).required(),
        role: Joi.string().valid('user', 'admin').default('user')
    }),

    updateUser: Joi.object({
        name: Joi.string().min(2).max(50).optional(),
        role: Joi.string().valid('user', 'admin').optional()
    }).min(1),

    userId: Joi.object({
        id: Joi.string().uuid().required()
    }),

    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10)
    })
};

// ========================================
// Mock Database
// ========================================

const db = {
    users: [
        {
            id: '123e4567-e89b-12d3-a456-426614174001',
            email: 'john@example.com',
            name: 'John Doe',
            role: 'user'
        },
        {
            id: '123e4567-e89b-12d3-a456-426614174002',
            email: 'jane@example.com',
            name: 'Jane Smith',
            role: 'admin'
        }
    ],

    findById(id) {
        return this.users.find(u => u.id === id);
    },

    create(data) {
        const user = {
            id: `123e4567-e89b-12d3-a456-${Date.now()}`,
            ...data
        };
        this.users.push(user);
        return user;
    },

    update(id, updates) {
        const index = this.users.findIndex(u => u.id === id);
        if (index === -1) return null;

        this.users[index] = { ...this.users[index], ...updates };
        return this.users[index];
    },

    delete(id) {
        const index = this.users.findIndex(u => u.id === id);
        if (index === -1) return false;

        this.users.splice(index, 1);
        return true;
    }
};

// ========================================
// Define Routes
// ========================================

// List users
apiRouter.get('/users',
    validateQuery(schemas.pagination),
    async (req, res) => {
        const { page, limit } = req.queryStringParameters;

        res.json({
            success: true,
            data: db.users,
            meta: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: db.users.length
            }
        });
    }
);

// Get user by ID
apiRouter.get('/users/:id',
    validateParams(schemas.userId),
    async (req, res) => {
        const user = db.findById(req.params.id);

        if (!user) {
            throw new NotFoundError('User');
        }

        res.json({
            success: true,
            data: user
        });
    }
);

// Create user
apiRouter.post('/users',
    validateBody(schemas.createUser),
    async (req, res) => {
        const user = db.create(req.body);

        res.status(201).json({
            success: true,
            data: user,
            message: 'User created successfully'
        });
    }
);

// Update user
apiRouter.patch('/users/:id',
    validateParams(schemas.userId),
    validateBody(schemas.updateUser),
    async (req, res) => {
        const user = db.update(req.params.id, req.body);

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

// Delete user
apiRouter.delete('/users/:id',
    validateParams(schemas.userId),
    async (req, res) => {
        const deleted = db.delete(req.params.id);

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
// Mount Router to Express
// ========================================

// Health check (direct Express route)
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is healthy'
    });
});

// Mount unified router at /api
apiRouter.mountExpress(app, '/api');

// ========================================
// Error Handlers
// ========================================

app.use(notFoundHandler());
app.use(errorHandler());

// ========================================
// Start Server
// ========================================

const PORT = process.env.PORT || 3000;

startServer(app, PORT);

console.log('\n📋 Available routes:');
console.log('  GET    /health');
console.log('  GET    /api/users');
console.log('  GET    /api/users/:id');
console.log('  POST   /api/users');
console.log('  PATCH  /api/users/:id');
console.log('  DELETE /api/users/:id');

console.log('\n💡 Same router works for both Lambda and Express!');
console.log('   For Lambda: exports.handler = apiRouter.lambda()');
console.log('   For Express: apiRouter.mountExpress(app, "/api")');
