# Changelog

All notable changes to adevUtils will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-07

### Added
- Initial release of adevUtils
- **Lambda Router Module** ⭐
  - Express-style routing for AWS Lambda
  - Path parameter support (e.g., `/users/:id`)
  - Middleware system (global and route-specific)
  - Built-in middlewares (CORS, logging, auth)
  - Automatic error handling
  - Request/Response helpers
- **Joi Validation Integration** ⭐
  - Schema-based validation
  - Validation middlewares (body, query, params, headers)
  - Pre-built schemas (user, e-commerce, CMS, etc.)
  - Common schema builders
  - Custom validators
  - Detailed error messages
- **Express Utilities** ⭐
  - Express app creation with common middlewares
  - Response helpers (success, error, paginated)
  - Error handling middleware
  - Async handler wrapper
  - Lambda-to-Express adapter
  - Request logging and ID tracking
  - Graceful server shutdown
- **Unified Router Enhancement** ⭐
  - Single router works for both Lambda and Express
  - `router.lambda()` for AWS Lambda
  - `router.express()` for Express middleware
  - `router.mountExpress(app, basePath)` for Express integration
  - Write routes once, deploy anywhere!
- HTTP utilities module
  - HTTP status codes and methods constants
  - Query string builders and parsers
  - Status code validators
- AWS utilities module
  - Lambda event parsing and response helpers
  - DynamoDB expression builders
  - S3 key and URI utilities
  - SES email parameter builders
- Validation utilities module
  - Email, phone, URL, UUID validators
  - Required fields validation
  - String sanitization
  - Range and length validators
- Logger utilities module
  - Structured JSON logging
  - Log levels (DEBUG, INFO, WARN, ERROR)
  - Context-aware logging
  - Request/response logging helpers
- Date utilities module
  - Timestamp generators
  - Date formatting
  - Date arithmetic (add days/hours)
  - Date comparisons
- String utilities module
  - Case conversions (camelCase, snake_case, kebab-case, PascalCase)
  - String truncation
  - Random string generation
  - Slugification
  - Template interpolation
- Error utilities module
  - Custom error classes (ValidationError, NotFoundError, etc.)
  - Error formatting helpers
  - Operational error detection
- Response utilities module
  - Success/error response builders
  - Paginated response helpers
  - Lambda response formatters
- Security utilities module
  - UUID and token generation
  - Hashing (SHA256, MD5)
  - HMAC creation and verification
  - AES-256-GCM encryption/decryption
  - Base64 encoding/decoding
  - HTML sanitization
  - Sensitive data masking
- Complete documentation
  - README with overview
  - Getting Started guide
  - Full API documentation
  - Usage examples
- Testing infrastructure setup
- Package configuration and dependencies

### Notes
- All modules are framework-agnostic and can be used in any Node.js project
- Zero external dependencies for core functionality
- Full CommonJS module support
