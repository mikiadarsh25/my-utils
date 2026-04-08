# Getting Started with adevUtils

## Installation

### Option 1: Local Package (Recommended for Monorepo)

In your project directory, install adevUtils as a local package:

```bash
npm install file:../adevUtils
```

### Option 2: Git Submodule

Add adevUtils as a git submodule:

```bash
git submodule add <repository-url> adevUtils
cd adevUtils
npm install
```

### Option 3: Copy to Project

Simply copy the adevUtils folder to your project and import directly.

## Basic Usage

### Import All Utilities

```javascript
const utils = require('adev-utils');

// Use utilities
console.log(utils.http.HTTP_STATUS.OK);
console.log(utils.string.toCamelCase('hello world'));
```

### Import Specific Modules

```javascript
const { http, validation, logger } = require('adev-utils');

// Use specific modules
console.log(http.HTTP_METHODS.GET);
console.log(validation.validateEmail('test@example.com'));
```

### Import Individual Utilities

```javascript
const { HTTP_STATUS, HTTP_METHODS } = require('adev-utils/src/http');
const { validateEmail } = require('adev-utils/src/validation');
const { createLogger } = require('adev-utils/src/logger');
```

## Quick Examples

### 1. HTTP Utilities

```javascript
const { http } = require('adev-utils');

// Use HTTP constants
if (response.statusCode === http.HTTP_STATUS.OK) {
    console.log('Success!');
}

// Build query string
const query = http.buildQueryString({ page: 1, limit: 10, sort: 'name' });
// Result: "?page=1&limit=10&sort=name"

// Check status codes
console.log(http.isSuccessStatus(200)); // true
console.log(http.isClientError(404)); // true
```

### 2. AWS Lambda Helper

```javascript
const { aws, response } = require('adev-utils');

exports.handler = async (event, context) => {
    try {
        // Parse Lambda event
        const { body, pathParameters } = aws.lambda.parseEvent(event);
        
        // Your business logic here
        const result = processData(body);
        
        // Return success response
        return aws.lambda.successResponse(result);
    } catch (error) {
        // Return error response
        return aws.lambda.errorResponse(error.message, 500);
    }
};
```

### 3. Validation

```javascript
const { validation } = require('adev-utils');

// Validate email
if (!validation.validateEmail(email)) {
    throw new Error('Invalid email format');
}

// Validate required fields
const { valid, missing } = validation.validateRequiredFields(
    requestBody,
    ['email', 'password', 'name']
);

if (!valid) {
    throw new Error(`Missing fields: ${missing.join(', ')}`);
}

// Sanitize input
const clean = validation.sanitizeString(userInput);
```

### 4. Structured Logging

```javascript
const { logger } = require('adev-utils');

// Create logger with context
const log = logger.createLogger({
    service: 'user-service',
    requestId: context.requestId
});

// Log messages
log.info('Processing user request', { userId: 123 });
log.warn('High memory usage detected');
log.error('Database connection failed', error);

// Create child logger with additional context
const childLog = log.child({ operation: 'createUser' });
childLog.info('Creating new user');
```

### 5. Date Operations

```javascript
const { date } = require('adev-utils');

// Get current timestamp
const now = date.getCurrentTimestamp();

// Format dates
const formatted = date.formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss');

// Date arithmetic
const tomorrow = date.addDays(new Date(), 1);
const nextHour = date.addHours(new Date(), 1);

// Date comparisons
if (date.isPast(expiryDate)) {
    console.log('Token has expired');
}

// Calculate differences
const daysDiff = date.getDaysDifference(startDate, endDate);
```

### 6. String Manipulation

```javascript
const { string } = require('adev-utils');

// Case conversions
const camel = string.toCamelCase('hello-world'); // 'helloWorld'
const snake = string.toSnakeCase('helloWorld'); // 'hello_world'
const kebab = string.toKebabCase('helloWorld'); // 'hello-world'

// Generate slug
const slug = string.slugify('Hello World! 123'); // 'hello-world-123'

// Truncate
const short = string.truncate('Long text here', 10); // 'Long te...'

// Template interpolation
const message = string.interpolate(
    'Hello {{name}}, you have {{count}} messages',
    { name: 'John', count: 5 }
);
```

### 7. Error Handling

```javascript
const { error } = require('adev-utils');

// Use custom error classes
if (!user) {
    throw new error.NotFoundError('User');
}

if (!hasPermission) {
    throw new error.AuthorizationError();
}

if (!isValid) {
    throw new error.ValidationError('Invalid input', { field: 'email' });
}

// Format error for response
try {
    // ... your code
} catch (err) {
    const formatted = error.formatError(err);
    return response.errorResponse(formatted.error, formatted.statusCode);
}
```

### 8. Response Formatting

```javascript
const { response } = require('adev-utils');

// Success response
return response.successResponse(
    { user: userData },
    'User created successfully'
);

// Error response
return response.errorResponse(
    'User not found',
    404
);

// Paginated response
return response.paginatedResponse(
    items,
    page,
    limit,
    totalCount
);

// Lambda-specific responses
return response.lambdaSuccess(data);
return response.lambdaError('Error message', 400);
```

### 9. Security Utilities

```javascript
const { security } = require('adev-utils');

// Generate UUID
const id = security.generateUUID();

// Generate secure token
const token = security.generateToken(32);

// Hash data
const hashed = security.hashSHA256(password);

// Create HMAC signature
const signature = security.createHMAC(data, secretKey);

// Verify HMAC
const isValid = security.verifyHMAC(data, signature, secretKey);

// Mask sensitive data
const maskedEmail = security.maskSensitiveData('john@example.com');
// Result: 'jo*********.com'

// Sanitize HTML
const clean = security.sanitizeHTML(userInput);
```

## Complete Lambda Handler Example

```javascript
const { aws, validation, logger, error, date } = require('adev-utils');

exports.handler = async (event, context) => {
    const startTime = Date.now();
    const log = logger.createLogger({ 
        requestId: context.requestId,
        service: 'user-api'
    });
    
    try {
        // Parse event
        const { body, pathParameters, queryStringParameters } = aws.lambda.parseEvent(event);
        
        // Validate input
        const { valid, missing } = validation.validateRequiredFields(body, ['email', 'name']);
        if (!valid) {
            throw new error.ValidationError('Missing required fields', missing);
        }
        
        if (!validation.validateEmail(body.email)) {
            throw new error.ValidationError('Invalid email format');
        }
        
        // Log request
        log.info('Processing user creation', { email: body.email });
        
        // Business logic here
        const user = await createUser(body);
        
        // Return success
        return aws.lambda.successResponse({
            user,
            timestamp: date.getCurrentTimestamp()
        }, 201);
        
    } catch (err) {
        log.error('Request failed', err);
        
        if (err instanceof error.AppError) {
            return aws.lambda.errorResponse(err.message, err.statusCode, err.details);
        }
        
        return aws.lambda.errorResponse('Internal server error', 500);
        
    } finally {
        const duration = Date.now() - startTime;
        log.info('Request completed', { duration: `${duration}ms` });
    }
};
```

## Next Steps

- Check out the [API Documentation](./API.md) for detailed function references
- See [examples/usage-example.js](../examples/usage-example.js) for more examples
- Browse individual module files in `src/` for JSDoc documentation

## Contributing

To add new utilities:

1. Create your utility file in the appropriate `src/` subdirectory
2. Export functions with JSDoc comments
3. Update the module's index.js to export your new functions
4. Add usage examples to this guide
5. Write tests in the `tests/` directory
