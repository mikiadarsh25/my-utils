/**
 * AWS Lambda Utilities
 * Helper functions for Lambda invocations and operations
 */

/**
 * Parse Lambda event
 * @param {Object} event - Lambda event object
 * @returns {Object}
 */
function parseEvent(event) {
    return {
        headers: event.headers || {},
        pathParameters: event.pathParameters || {},
        queryStringParameters: event.queryStringParameters || {},
        body: event.body ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) : {},
        requestContext: event.requestContext || {},
        isBase64Encoded: event.isBase64Encoded || false
    };
}

/**
 * Create Lambda response object
 * @param {number} statusCode - HTTP status code
 * @param {*} body - Response body
 * @param {Object} headers - Response headers
 * @returns {Object}
 */
function createResponse(statusCode, body, headers = {}) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
            ...headers
        },
        body: typeof body === 'string' ? body : JSON.stringify(body)
    };
}

/**
 * Create success response
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object}
 */
function successResponse(data, statusCode = 200) {
    return createResponse(statusCode, {
        success: true,
        data
    });
}

/**
 * Create error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {*} details - Additional error details
 * @returns {Object}
 */
function errorResponse(message, statusCode = 500, details = null) {
    const body = {
        success: false,
        error: message
    };

    if (details) {
        body.details = details;
    }

    return createResponse(statusCode, body);
}

/**
 * Extract user info from request context
 * @param {Object} event - Lambda event object
 * @returns {Object|null}
 */
function extractUserInfo(event) {
    const requestContext = event.requestContext || {};
    const authorizer = requestContext.authorizer || {};

    return {
        userId: authorizer.principalId || authorizer.userId || null,
        email: authorizer.email || null,
        claims: authorizer.claims || {},
        identity: requestContext.identity || {}
    };
}

module.exports = {
    parseEvent,
    createResponse,
    successResponse,
    errorResponse,
    extractUserInfo
};
