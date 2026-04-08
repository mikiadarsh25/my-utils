/**
 * adevUtils Usage Examples
 * Demonstrates how to use various utility modules
 */

// Import utilities
const { http, aws, validation, logger, date, string, error, response, security } = require('../index');

// ===== HTTP Utilities =====
console.log('HTTP Methods:', http.HTTP_METHODS);
console.log('HTTP Status Codes:', http.HTTP_STATUS);
console.log('Is 200 success?', http.isSuccessStatus(200));
console.log('Query String:', http.buildQueryString({ page: 1, limit: 10 }));

// ===== AWS Lambda Utilities =====
const lambdaEvent = {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test' }),
    pathParameters: { id: '123' }
};

const parsedEvent = aws.lambda.parseEvent(lambdaEvent);
console.log('Parsed Lambda Event:', parsedEvent);

const successResp = aws.lambda.successResponse({ message: 'Success!' });
console.log('Lambda Success Response:', successResp);

// ===== Validation Utilities =====
console.log('Is valid email?', validation.validateEmail('test@example.com'));
console.log('Is valid phone?', validation.validatePhone('+1234567890'));
console.log('Is valid URL?', validation.validateURL('https://example.com'));

const requiredCheck = validation.validateRequiredFields(
    { name: 'John', email: 'john@example.com' },
    ['name', 'email', 'phone']
);
console.log('Required fields validation:', requiredCheck);

// ===== Logger Utilities =====
const log = logger.createLogger({ service: 'example-service' });
log.info('This is an info message');
log.warn('This is a warning');
log.error('This is an error', new Error('Sample error'));

// ===== Date Utilities =====
console.log('Current Timestamp:', date.getCurrentTimestamp());
console.log('Unix Timestamp:', date.getUnixTimestamp());
console.log('Formatted Date:', date.formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss'));
console.log('5 days from now:', date.addDays(new Date(), 5));
console.log('Is in past?', date.isPast('2020-01-01'));

// ===== String Utilities =====
console.log('Camel Case:', string.toCamelCase('hello world'));
console.log('Snake Case:', string.toSnakeCase('helloWorld'));
console.log('Kebab Case:', string.toKebabCase('helloWorld'));
console.log('Slug:', string.slugify('Hello World! This is a Test'));
console.log('Random String:', string.randomString(16));
console.log('Interpolate:', string.interpolate('Hello {{name}}!', { name: 'John' }));

// ===== Error Utilities =====
try {
    throw new error.ValidationError('Invalid input data', { field: 'email' });
} catch (err) {
    console.log('Formatted Error:', error.formatError(err));
}

// ===== Response Utilities =====
const apiSuccess = response.successResponse({ user: { id: 1, name: 'John' } }, 'User fetched successfully');
console.log('Success Response:', apiSuccess);

const apiError = response.errorResponse('User not found', 404);
console.log('Error Response:', apiError);

const paginated = response.paginatedResponse(
    [{ id: 1 }, { id: 2 }],
    1,
    10,
    100
);
console.log('Paginated Response:', paginated);

// ===== Security Utilities =====
console.log('UUID:', security.generateUUID());
console.log('Token:', security.generateToken(16));
console.log('SHA256 Hash:', security.hashSHA256('password123'));
console.log('Base64 Encode:', security.base64Encode('Hello World'));
console.log('Masked Email:', security.maskSensitiveData('john.doe@example.com', 3, 3));
console.log('Sanitized HTML:', security.sanitizeHTML('<script>alert("xss")</script>'));

// Example: Create a complete Lambda function handler
async function exampleLambdaHandler(event, context) {
    const startTime = Date.now();
    const log = logger.createLogger({ requestId: context.requestId });

    try {
        // Parse event
        const { body, pathParameters } = aws.lambda.parseEvent(event);

        // Validate input
        const validation = validation.validateRequiredFields(body, ['email', 'name']);
        if (!validation.valid) {
            throw new error.ValidationError('Missing required fields', validation.missing);
        }

        // Process data
        log.info('Processing request', { userId: pathParameters.id });

        // Return success response
        return aws.lambda.successResponse({
            message: 'Request processed successfully',
            timestamp: date.getCurrentTimestamp()
        });

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
}

console.log('\n=== Example Lambda Handler Created ===');
console.log('See exampleLambdaHandler function for a complete example');
