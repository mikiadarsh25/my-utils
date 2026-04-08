/**
 * Express Basic Example
 * Simple Express server using adevUtils
 */

const { createExpressApp, errorHandler, notFoundHandler, startServer } = require('../src/express');
const { validateBody, Joi } = require('../src/validation');
const { NotFoundError, ValidationError } = require('../src/error');

// Create Express app with common middlewares
const app = createExpressApp({
    cors: true,
    json: true,
    logging: true,
    requestId: true
});

// ========================================
// Routes
// ========================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString()
    });
});

// Simple GET route
app.get('/api/hello', (req, res) => {
    res.json({
        success: true,
        message: 'Hello from Express!',
        requestId: req.requestId
    });
});

// GET with query parameters
app.get('/api/greet', (req, res) => {
    const { name = 'Guest' } = req.query;
    res.json({
        success: true,
        message: `Hello, ${name}!`
    });
});

// POST with validation
const userSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    age: Joi.number().integer().min(18).max(120).optional()
});

app.post('/api/users', (req, res, next) => {
    try {
        const { validate } = require('../src/validation');
        const validatedData = validate(req.body, userSchema);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: validatedData
        });
    } catch (error) {
        next(error);
    }
});

// GET with path parameters
app.get('/api/users/:id', (req, res) => {
    const { id } = req.params;

    // Mock user data
    const user = {
        id,
        name: 'John Doe',
        email: 'john@example.com'
    };

    res.json({
        success: true,
        data: user
    });
});

// Route that throws error
app.get('/api/error', (req, res, next) => {
    next(new NotFoundError('This resource does not exist'));
});

// Async route with error handling
app.get('/api/async', async (req, res, next) => {
    try {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 100));

        res.json({
            success: true,
            message: 'Async operation completed'
        });
    } catch (error) {
        next(error);
    }
});

// ========================================
// Error Handlers (Must be last)
// ========================================

// 404 handler
app.use(notFoundHandler());

// Error handler
app.use(errorHandler({
    includeStack: true
}));

// ========================================
// Start Server
// ========================================

const PORT = process.env.PORT || 3000;

startServer(app, PORT);

console.log('\n📋 Available routes:');
console.log('  GET  /health');
console.log('  GET  /api/hello');
console.log('  GET  /api/greet?name=YourName');
console.log('  POST /api/users');
console.log('  GET  /api/users/:id');
console.log('  GET  /api/error');
console.log('  GET  /api/async');
