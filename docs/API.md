# API Documentation

Complete reference for all adevUtils functions and utilities.

## Table of Contents

- [HTTP Utilities](#http-utilities)
- [AWS Utilities](#aws-utilities)
- [Validation Utilities](#validation-utilities)
- [Logger Utilities](#logger-utilities)
- [Date Utilities](#date-utilities)
- [String Utilities](#string-utilities)
- [Error Utilities](#error-utilities)
- [Response Utilities](#response-utilities)
- [Security Utilities](#security-utilities)

---

## HTTP Utilities

### Constants

#### `HTTP_METHODS`
Object containing standard HTTP method constants.
- `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`

#### `HTTP_STATUS`
Object containing HTTP status code constants.
- Success: `OK (200)`, `CREATED (201)`, `NO_CONTENT (204)`
- Client Error: `BAD_REQUEST (400)`, `UNAUTHORIZED (401)`, `FORBIDDEN (403)`, `NOT_FOUND (404)`, etc.
- Server Error: `INTERNAL_SERVER_ERROR (500)`, `BAD_GATEWAY (502)`, etc.

#### `HTTP_HEADERS`
Common HTTP header constants.

#### `CONTENT_TYPES`
Common content type constants.

### Functions

#### `isSuccessStatus(statusCode)`
Check if HTTP status code is successful (2xx).

#### `isClientError(statusCode)`
Check if HTTP status code is client error (4xx).

#### `isServerError(statusCode)`
Check if HTTP status code is server error (5xx).

#### `buildQueryString(params)`
Build query string from object.
- Returns: `"?key1=value1&key2=value2"`

#### `parseQueryString(queryString)`
Parse query string to object.

---

## AWS Utilities

### Lambda

#### `parseEvent(event)`
Parse Lambda event into structured object.
- Returns: `{ headers, pathParameters, queryStringParameters, body, requestContext }`

#### `createResponse(statusCode, body, headers)`
Create Lambda response object.

#### `successResponse(data, statusCode)`
Create Lambda success response.

#### `errorResponse(message, statusCode, details)`
Create Lambda error response.

#### `extractUserInfo(event)`
Extract user information from request context.

### DynamoDB

#### `buildUpdateExpression(updates)`
Build DynamoDB update expression from object.
- Returns: `{ UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues }`

#### `buildFilterExpression(filters)`
Build DynamoDB filter expression.

#### `parseScanResults(result)`
Parse DynamoDB scan/query results.

### S3

#### `buildS3Key(...parts)`
Build S3 key path from parts.

#### `parseS3Uri(s3Uri)`
Parse S3 URI into bucket and key.
- Returns: `{ bucket, key }`

#### `generateS3Uri(bucket, key)`
Generate S3 URI from bucket and key.

#### `getFileExtension(key)`
Extract file extension from S3 key.

#### `getContentType(extension)`
Get content type from file extension.

### SES

#### `buildEmailParams(options)`
Build email parameters for SES.

#### `replaceTemplateVariables(template, variables)`
Replace template variables in email content.

#### `isValidEmail(email)`
Validate email address format.

---

## Validation Utilities

#### `validateEmail(email)`
Validate email address format.

#### `validatePhone(phone)`
Validate phone number (international format).

#### `validateURL(url)`
Validate URL format.

#### `validateUUID(uuid)`
Validate UUID format.

#### `validateRequiredFields(data, requiredFields)`
Validate required fields in object.
- Returns: `{ valid: boolean, missing: string[] }`

#### `sanitizeString(input)`
Sanitize string input (remove XSS).

#### `sanitizeObject(obj, allowedKeys)`
Validate and sanitize object keys.

#### `validateNumberRange(value, min, max)`
Validate number is within range.

#### `validateStringLength(str, minLength, maxLength)`
Validate string length.

---

## Logger Utilities

### Classes

#### `Logger`
Structured logger class with context.

**Methods:**
- `debug(message, meta)`
- `info(message, meta)`
- `warn(message, meta)`
- `error(message, error, meta)`
- `child(additionalContext)` - Create child logger with additional context

### Functions

#### `createLogger(context)`
Create logger instance with context.

#### `logRequest(event)`
Log incoming request information.

#### `logResponse(statusCode, duration)`
Log response information.

---

## Date Utilities

#### `getCurrentTimestamp()`
Get current timestamp in ISO format.

#### `getUnixTimestamp()`
Get current Unix timestamp (seconds).

#### `formatDate(date, format)`
Format date to readable string.
- Format: `'YYYY-MM-DD'`, `'YYYY-MM-DD HH:mm:ss'`

#### `addDays(date, days)`
Add days to a date.

#### `addHours(date, hours)`
Add hours to a date.

#### `isPast(date)`
Check if date is in the past.

#### `isFuture(date)`
Check if date is in the future.

#### `getDaysDifference(date1, date2)`
Get difference between two dates in days.

#### `isValidDate(date)`
Check if date is valid.

#### `startOfDay(date)`
Get start of day (00:00:00).

#### `endOfDay(date)`
Get end of day (23:59:59).

---

## String Utilities

#### `toCamelCase(str)`
Convert string to camelCase.

#### `toSnakeCase(str)`
Convert string to snake_case.

#### `toKebabCase(str)`
Convert string to kebab-case.

#### `toPascalCase(str)`
Convert string to PascalCase.

#### `capitalize(str)`
Capitalize first letter.

#### `truncate(str, length, suffix)`
Truncate string to specified length.

#### `randomString(length, chars)`
Generate random string.

#### `slugify(str)`
Generate slug from string.

#### `isEmpty(str)`
Check if string is empty or whitespace.

#### `interpolate(template, values)`
Replace placeholders in template string.
- Template: `"Hello {{name}}"`

#### `removeSpecialChars(str, keep)`
Remove special characters from string.

---

## Error Utilities

### Classes

All error classes extend `AppError`:

- `AppError(message, statusCode, details)` - Base error class
- `ValidationError(message, details)` - 400
- `AuthenticationError(message)` - 401
- `AuthorizationError(message)` - 403
- `NotFoundError(resource)` - 404
- `ConflictError(message)` - 409
- `InternalServerError(message)` - 500

### Functions

#### `formatError(error)`
Format error for API response.

#### `isOperationalError(error)`
Check if error is operational (expected).

#### `logError(error, context)`
Log error with context.

---

## Response Utilities

#### `successResponse(data, message, meta)`
Create success response.

#### `errorResponse(message, statusCode, details)`
Create error response.

#### `paginatedResponse(items, page, limit, total)`
Create paginated response.

#### `httpResponse(statusCode, body, headers)`
Create response with HTTP status.

#### `lambdaSuccess(data, statusCode)`
Create Lambda success response.

#### `lambdaError(message, statusCode, details)`
Create Lambda error response.

#### `apiResponse(success, data, options)`
Build standard API response structure.

---

## Security Utilities

#### `generateUUID()`
Generate random UUID v4.

#### `generateToken(length)`
Generate random token (hex).

#### `hashSHA256(data)`
Hash string using SHA256.

#### `hashMD5(data)`
Hash string using MD5.

#### `createHMAC(data, secret, algorithm)`
Create HMAC signature.

#### `verifyHMAC(data, signature, secret, algorithm)`
Verify HMAC signature.

#### `encrypt(data, key)`
Encrypt data using AES-256-GCM.
- Returns: `{ encrypted, iv, tag }`

#### `decrypt(encrypted, key, iv, tag)`
Decrypt data using AES-256-GCM.

#### `base64Encode(data)`
Encode data to Base64.

#### `base64Decode(data)`
Decode Base64 data.

#### `sanitizeHTML(html)`
Sanitize HTML to prevent XSS.

#### `maskSensitiveData(data, visibleStart, visibleEnd, maskChar)`
Mask sensitive data (email, phone, etc).
- Example: `'john@example.com'` → `'jo**********om'`

---

For more detailed examples, see [GETTING_STARTED.md](./GETTING_STARTED.md) and [examples/usage-example.js](../examples/usage-example.js).
