# Validation Guide

Complete guide to input validation using both basic validators and Joi schemas.

## Table of Contents
- [Basic Validation](#basic-validation)
- [Joi Schema Validation](#joi-schema-validation)
- [Validation Middlewares](#validation-middlewares)
- [Pre-built Schemas](#pre-built-schemas)
- [Custom Validators](#custom-validators)
- [Best Practices](#best-practices)

## Basic Validation

Simple validators without dependencies:

```javascript
const { validation } = require('adev-utils');

// Email validation
if (!validation.validateEmail('test@example.com')) {
    throw new Error('Invalid email');
}

// Phone validation
if (!validation.validatePhone('+1234567890')) {
    throw new Error('Invalid phone');
}

// URL validation
if (!validation.validateURL('https://example.com')) {
    throw new Error('Invalid URL');
}

// UUID validation
if (!validation.validateUUID('123e4567-e89b-12d3-a456-426614174000')) {
    throw new Error('Invalid UUID');
}

// Required fields
const { valid, missing } = validation.validateRequiredFields(
    { email: 'test@example.com', name: 'John' },
    ['email', 'name', 'password']
);

if (!valid) {
    throw new Error(`Missing fields: ${missing.join(', ')}`);
}

// String sanitization
const clean = validation.sanitizeString('<script>alert("xss")</script>');

// Number range validation
if (!validation.validateNumberRange(age, 18, 100)) {
    throw new Error('Age must be between 18 and 100');
}

// String length validation
if (!validation.validateStringLength(password, 8, 128)) {
    throw new Error('Password must be 8-128 characters');
}
```

## Joi Schema Validation

Powerful schema-based validation:

### Basic Usage

```javascript
const { Joi, validate } = require('adev-utils/src/validation');

const userSchema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).max(50).required(),
    age: Joi.number().integer().min(18).max(120).optional()
});

try {
    const validatedData = validate(data, userSchema);
    // Use validatedData (sanitized and validated)
} catch (error) {
    // error is a ValidationError with details
    console.log(error.details);
}
```

### Common Schema Patterns

#### String Validation

```javascript
Joi.string()
    .min(2)                    // Minimum length
    .max(50)                   // Maximum length
    .required()                // Required field
    .optional()                // Optional field
    .email()                   // Email format
    .uri()                     // URL format
    .uuid()                    // UUID format
    .alphanum()                // Alphanumeric only
    .pattern(/regex/)          // Custom pattern
    .lowercase()               // Convert to lowercase
    .uppercase()               // Convert to uppercase
    .trim()                    // Trim whitespace
    .default('value')          // Default value
```

#### Number Validation

```javascript
Joi.number()
    .integer()                 // Must be integer
    .min(0)                    // Minimum value
    .max(100)                  // Maximum value
    .positive()                // Must be positive
    .negative()                // Must be negative
    .precision(2)              // Decimal precision
    .multiple(5)               // Must be multiple of
    .port()                    // Valid port number
```

#### Date Validation

```javascript
Joi.date()
    .iso()                     // ISO 8601 format
    .min('1-1-2000')          // Minimum date
    .max('now')               // Maximum date (now)
    .greater('2020-01-01')    // After specific date
    .less('2025-12-31')       // Before specific date
```

#### Array Validation

```javascript
Joi.array()
    .items(Joi.string())       // Array of strings
    .min(1)                    // Minimum items
    .max(10)                   // Maximum items
    .length(5)                 // Exact length
    .unique()                  // All items unique
    .sparse()                  // Allow undefined items
```

#### Object Validation

```javascript
Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email(),
    address: Joi.object({
        street: Joi.string(),
        city: Joi.string()
    })
})
    .unknown(false)            // Disallow unknown keys
    .min(1)                    // Minimum number of keys
    .with('a', 'b')           // If 'a' then 'b' required
    .without('a', 'b')        // 'a' and 'b' cannot coexist
```

#### Enum Validation

```javascript
Joi.string().valid('admin', 'user', 'guest')
Joi.number().valid(1, 2, 3, 4, 5)
```

#### Boolean Validation

```javascript
Joi.boolean()
    .truthy('yes', '1')       // Values considered true
    .falsy('no', '0')         // Values considered false
```

### Conditional Validation

```javascript
const schema = Joi.object({
    type: Joi.string().valid('student', 'teacher').required(),
    studentId: Joi.when('type', {
        is: 'student',
        then: Joi.string().required(),
        otherwise: Joi.forbidden()
    }),
    teacherId: Joi.when('type', {
        is: 'teacher',
        then: Joi.string().required(),
        otherwise: Joi.forbidden()
    })
});
```

### Cross-field Validation

```javascript
// Password confirmation
const schema = Joi.object({
    password: Joi.string().min(8).required(),
    confirmPassword: Joi.any().valid(Joi.ref('password')).required()
        .messages({ 'any.only': 'Passwords must match' })
});

// Date range
const schema = Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().min(Joi.ref('startDate')).required()
        .messages({ 'date.min': 'End date must be after start date' })
});
```

### Custom Error Messages

```javascript
const schema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
        'string.empty': 'Email cannot be empty'
    }),
    age: Joi.number().min(18).messages({
        'number.min': 'You must be at least 18 years old'
    })
});
```

## Validation Middlewares

Use with the Lambda router:

### Validate Request Body

```javascript
const { validateBody } = require('adev-utils/src/validation');

const userSchema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().required()
});

app.post('/users', validateBody(userSchema), async (req, res) => {
    // req.body is validated
    const user = req.body;
    res.json({ success: true, data: user });
});
```

### Validate Query Parameters

```javascript
const { validateQuery } = require('adev-utils/src/validation');

const querySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().optional()
});

app.get('/users', validateQuery(querySchema), async (req, res) => {
    // req.queryStringParameters is validated
    const { page, limit } = req.queryStringParameters;
});
```

### Validate Path Parameters

```javascript
const { validateParams } = require('adev-utils/src/validation');

const idSchema = Joi.object({
    id: Joi.string().uuid().required()
});

app.get('/users/:id', validateParams(idSchema), async (req, res) => {
    // req.params.id is validated
    const { id } = req.params;
});
```

### Validate Headers

```javascript
const { validateHeaders } = require('adev-utils/src/validation');

const headerSchema = Joi.object({
    'x-api-key': Joi.string().required(),
    'x-request-id': Joi.string().uuid().optional()
});

app.post('/api/data', validateHeaders(headerSchema), async (req, res) => {
    // req.headers is validated
});
```

## Pre-built Schemas

### Common Schemas

```javascript
const { commonSchemas } = require('adev-utils/src/validation');

// Use pre-built schemas
const schema = Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    phone: commonSchemas.phone,
    website: commonSchemas.url,
    userId: commonSchemas.uuid
});
```

Available common schemas:
- `email` - Valid email format
- `password` - Strong password (min 8 chars, uppercase, lowercase, number, special char)
- `uuid` - Valid UUID v4
- `phone` - International phone format
- `url` - Valid URL
- `dateISO` - ISO 8601 date
- `name` - Person name (2-100 chars)
- `status(values)` - Enum status field

### Schema Builders

```javascript
const { schemaBuilders } = require('adev-utils/src/validation');

// User registration
app.post('/auth/register',
    validateBody(schemaBuilders.userRegistration()),
    async (req, res) => {
        // Validates: email, password, firstName, lastName, phone (optional)
    }
);

// User login
app.post('/auth/login',
    validateBody(schemaBuilders.userLogin()),
    async (req, res) => {
        // Validates: email, password
    }
);

// Pagination query
app.get('/posts',
    validateQuery(schemaBuilders.paginationQuery()),
    async (req, res) => {
        // Validates: page, limit, sortBy, sortOrder, search
    }
);

// ID parameter
app.get('/users/:id',
    validateParams(schemaBuilders.idParam()),
    async (req, res) => {
        // Validates: id (UUID)
    }
);
```

### Custom Validators

```javascript
const { customValidators } = require('adev-utils/src/validation');

// Password confirmation
const schema = customValidators.passwordConfirmation();

// Date range
const schema = customValidators.dateRange();

// File upload
const schema = customValidators.fileUpload({
    maxSize: 5 * 1024 * 1024,  // 5MB
    allowedTypes: ['image/jpeg', 'image/png']
});
```

## Complete Schema Examples

Check out [examples/validation-schemas.js](../examples/validation-schemas.js) for comprehensive examples including:

- **User schemas** - Registration, login, profile update, password change
- **E-commerce schemas** - Products, orders, cart
- **Blog/CMS schemas** - Posts, comments
- **API query schemas** - Pagination, sorting, filtering
- **File upload schemas** - Images, documents, CSV
- **Tenant schemas** - Multi-tenancy settings

## Best Practices

1. **Always validate input** - Never trust client data
2. **Use specific schemas** - Don't validate more than needed
3. **Provide clear error messages** - Help users fix issues
4. **Sanitize data** - Use `stripUnknown: true`
5. **Use defaults** - Provide sensible defaults
6. **Validate early** - Use middlewares at route level
7. **Reuse schemas** - Create common schema library
8. **Document schemas** - Add descriptions to fields
9. **Test edge cases** - Validate with various inputs
10. **Keep schemas maintainable** - Break down complex schemas

## Error Handling

```javascript
const { ValidationError } = require('adev-utils/src/error');

try {
    const data = validate(input, schema);
} catch (error) {
    if (error instanceof ValidationError) {
        // error.message - Summary message
        // error.details - Array of field errors
        
        error.details.forEach(detail => {
            console.log(`Field: ${detail.field}`);
            console.log(`Message: ${detail.message}`);
            console.log(`Type: ${detail.type}`);
        });
    }
}
```

## See Also

- [Router Guide](./ROUTER.md)
- [API Documentation](./API.md)
- [Validation Examples](../examples/validation-schemas.js)
- [Router Examples](../examples/router-example.js)
