# my-utils

A comprehensive utility modules library for Node.js applications - Unified router for Lambda & Express, Joi validation, AWS helpers, and more.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org)

## Overview

**my-utils** is a production-ready utility library that provides:
- 🚀 **Unified Router** - Write routes once, deploy to Lambda or Express
- ✅ **Joi Validation** - Schema-based input validation with pre-built schemas
- ⚡ **Express Utilities** - Quick Express app setup with common middlewares
- 🔧 **AWS Helpers** - Lambda, DynamoDB, S3, SES utilities
- 🛡️ **Security** - Hashing, encryption, token generation
- 📝 **Logging** - Structured JSON logging
- 🎯 **Zero Dependencies Core** - Only Joi and Express as optional peer dependencies

## Installation

### From GitHub
```bash
npm install git+https://github.com/mikiadarsh25/my-utils.git
```

### From Local Path
```bash
npm install file:../my-utils
```

### Clone Repository
```bash
git clone https://github.com/mikiadarsh25/my-utils.git
cd my-utils
npm install
```

## Quick Start

### Unified Router (Lambda & Express) ⭐

Write your routes once and deploy to **both** AWS Lambda and Express:

```javascript
const { createRouter } = require('my-utils/src/router');
const { validateBody, Joi } = require('my-utils/src/validation');

const router = createRouter();

// Define routes with validation
const userSchema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).required()
});

router.post('/users', validateBody(userSchema), async (req, res) => {
    const user = req.body;
    res.status(201).json({ success: true, data: user });
});

// ============================================
// Deploy to AWS Lambda
// ============================================
exports.handler = router.lambda();

// ============================================
// Deploy to Express (same routes!)
// ============================================
const { createExpressApp, startServer } = require('my-utils/src/express');
const app = createExpressApp();
router.mountExpress(app, '/api');
startServer(app, 3000);
```

### Basic Utilities

```javascript
// Import specific utilities
const { HTTP_STATUS, HTTP_METHODS } = require('my-utils/src/http');
const { validateEmail, validatePhone } = require('my-utils/src/validation');
const { logger } = require('my-utils/src/logger');
const { formatDate, getCurrentTimestamp } = require('my-utils/src/date');

// Or import all
const utils = require('my-utils');
```

## Structure

```
my-utils/
├── src/
│   ├── router/        # Unified Lambda/Express router & middlewares
│   ├── express/       # Express app creation & utilities
│   ├── validation/    # Joi validation & pre-built schemas
│   ├── http/          # HTTP constants, methods, status codes
│   ├── aws/           # AWS Lambda, DynamoDB, S3, SES utilities
│   ├── logger/        # Structured JSON logging
│   ├── date/          # Date formatting & manipulation
│   ├── string/        # String utilities (camelCase, slugify, etc.)
│   ├── error/         # Custom error classes
│   ├── response/      # Response formatting helpers
│   └── security/      # Hashing, encryption, tokens
├── examples/          # 7 complete working examples
├── docs/              # Detailed documentation
├── tests/             # Unit tests
└── index.js           # Main entry point
```

## Modules

### Unified Router ⭐
- **Write once, deploy anywhere** - Same routes for Lambda & Express
- Express-style routing with path parameters
- Middleware system (global + route-specific)
- Built-in CORS, logging, auth middlewares
- Automatic error handling

### Express Utilities ⭐
- Quick Express app setup with common middlewares
- Response helpers (success, error, paginated)
- Error handling middleware
- Async handler wrapper
- Lambda-to-Express adapter
- Request logging & ID tracking

### Validation Utilities
- **Joi Integration** - Schema-based validation
- Pre-built schemas (user, e-commerce, CMS, etc.)
- Validation middlewares (body, query, params, headers)
- Basic validators (email, phone, URL, UUID)
- Input sanitization

### HTTP Utilities
- HTTP status codes and methods constants
- Query string builders and parsers
- Status code validators

### AWS Utilities
- **Lambda** - Event parsing, response helpers, user extraction
- **DynamoDB** - Expression builders, result parsers
- **S3** - Key builders, URI parsers, content type helpers
- **SES** - Email parameter builders, template variables

### Logger Utilities
- Structured JSON logging
- Log levels (DEBUG, INFO, WARN, ERROR)
- Context-aware logging
- Request/response logging helpers

### Date Utilities
- Timestamp generation (ISO, Unix)
- Date formatting (custom patterns)
- Date arithmetic (add days/hours)
- Date comparisons (isPast, isFuture)

### String Utilities
- Case conversions (camelCase, snake_case, kebab-case, PascalCase)
- String truncation and slugification
- Random string generation
- Template interpolation

### Error Utilities
- Custom error classes (ValidationError, NotFoundError, etc.)
- Error formatting helpers
- Operational error detection

### Response Utilities
- Success/error response builders
- Paginated response helpers
- Lambda response formatters

### Security Utilities
- UUID and token generation
- Hashing (SHA256, MD5, HMAC)
- AES-256-GCM encryption/decryption
- Base64 encoding/decoding
- HTML sanitization
- Sensitive data masking

## Examples

### 1. Complete REST API (Lambda or Express)

```javascript
const { createRouter } = require('my-utils/src/router');
const { validateBody, validateParams, Joi } = require('my-utils/src/validation');
const { NotFoundError } = require('my-utils/src/error');

const router = createRouter();

const userSchema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).required()
});

// List users
router.get('/users', async (req, res) => {
    const users = await db.getUsers();
    res.json({ success: true, data: users });
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
    const user = await db.getUserById(req.params.id);
    if (!user) throw new NotFoundError('User');
    res.json({ success: true, data: user });
});

// Create user
router.post('/users', validateBody(userSchema), async (req, res) => {
    const user = await db.createUser(req.body);
    res.status(201).json({ success: true, data: user });
});

// For Lambda
exports.handler = router.lambda();

// For Express
const { createExpressApp, errorHandler, startServer } = require('my-utils/src/express');
const app = createExpressApp();
router.mountExpress(app, '/api');
app.use(errorHandler());
startServer(app, 3000);
```

### 2. Express Server with Validation

```javascript
const { createExpressApp, errorHandler, notFoundHandler, startServer } = require('my-utils/src/express');
const { validateBody, Joi } = require('my-utils/src/validation');

const app = createExpressApp({
    cors: true,
    json: true,
    logging: true
});

const userSchema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).required()
});

app.post('/api/users', (req, res, next) => {
    try {
        const { validate } = require('my-utils/src/validation');
        const userData = validate(req.body, userSchema);
        res.status(201).json({ success: true, data: userData });
    } catch (error) {
        next(error);
    }
});

app.use(notFoundHandler());
app.use(errorHandler());
startServer(app, 3000);
```

### 3. Using Utilities

```javascript
const utils = require('my-utils');

// HTTP utilities
console.log(utils.http.HTTP_STATUS.OK); // 200
const query = utils.http.buildQueryString({ page: 1, limit: 10 });

// Date utilities
const timestamp = utils.date.getCurrentTimestamp();
const formatted = utils.date.formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss');

// String utilities
const slug = utils.string.slugify('Hello World!'); // 'hello-world'
const camel = utils.string.toCamelCase('hello-world'); // 'helloWorld'

// Security utilities
const token = utils.security.generateToken(32);
const hash = utils.security.hashSHA256('password');
const uuid = utils.security.generateUUID();

// Validation
const isValid = utils.validation.validateEmail('test@example.com');
```

## Documentation

### Core Guides
- 📘 [Getting Started](./docs/GETTING_STARTED.md) - Complete usage guide
- 📗 [Router Guide](./docs/ROUTER.md) - Unified routing for Lambda & Express
- 📕 [Express Guide](./docs/EXPRESS.md) - Express utilities and setup
- 📙 [Validation Guide](./docs/VALIDATION.md) - Joi validation and schemas
- 📔 [API Reference](./docs/API.md) - Complete API documentation

### Examples
- `examples/router-example.js` - 12 routing patterns
- `examples/express-basic.js` - Basic Express server
- `examples/express-with-router.js` - Unified router with Express
- `examples/express-full-api.js` - Complete API with authentication
- `examples/validation-schemas.js` - Pre-built validation schemas
- `examples/complete-api-example.js` - Full CRUD API
- `examples/usage-example.js` - All utilities showcase

## Running Examples

```bash
# Install dependencies
npm install

# Run examples
node examples/express-basic.js
node examples/express-with-router.js
node examples/express-full-api.js
```

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

## Use Cases

### 1. Serverless Applications (AWS Lambda)
Deploy API endpoints to Lambda with automatic request/response handling and validation.

### 2. Express Applications
Build traditional Express servers with pre-configured middlewares and utilities.

### 3. Hybrid Applications
Write code once and deploy to both Lambda (serverless) and Express (traditional server).

### 4. Microservices
Use consistent utilities across multiple services for HTTP, validation, logging, etc.

### 5. API Development
Rapid API development with built-in validation, error handling, and response formatting.

## Features

✅ **Write Once, Deploy Anywhere** - Same router for Lambda and Express  
✅ **Type-Safe Validation** - Joi schemas with detailed error messages  
✅ **Zero Boilerplate** - Pre-configured Express setup  
✅ **Production Ready** - Error handling, logging, CORS included  
✅ **Well Documented** - Comprehensive guides and examples  
✅ **Lightweight** - Minimal dependencies  
✅ **Modular** - Use only what you need  
✅ **Battle Tested** - Used in production applications  

## Best Practices

1. **Use validation middlewares** - Always validate input data
2. **Use unified router** - Write routes once, deploy anywhere
3. **Handle errors properly** - Use custom error classes
4. **Enable logging** - Use structured logging in production
5. **Sanitize inputs** - Validate and sanitize all user inputs
6. **Use environment variables** - Configure via process.env

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.

## License

MIT © Adarsh Prakash

## Repository

- **GitHub**: https://github.com/mikiadarsh25/my-utils
- **Issues**: https://github.com/mikiadarsh25/my-utils/issues
- **NPM**: `npm install git+https://github.com/mikiadarsh25/my-utils.git`

## Support

For questions, issues, or feature requests, please open an issue on GitHub.

---

Made with ❤️ by Adarsh Prakash
