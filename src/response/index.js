/**
 * Response Utilities Module
 * Standard response formatting helpers
 */

/**
 * Create success response
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {Object} meta - Additional metadata
 * @returns {Object}
 */
function successResponse(data, message = null, meta = {}) {
    const response = {
        success: true,
        data
    };

    if (message) {
        response.message = message;
    }

    if (Object.keys(meta).length > 0) {
        response.meta = meta;
    }

    return response;
}

/**
 * Create error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {*} details - Error details
 * @returns {Object}
 */
function errorResponse(message, statusCode = 500, details = null) {
    const response = {
        success: false,
        error: message,
        statusCode
    };

    if (details) {
        response.details = details;
    }

    return response;
}

/**
 * Create paginated response
 * @param {Array} items - Array of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items count
 * @returns {Object}
 */
function paginatedResponse(items, page, limit, total) {
    const totalPages = Math.ceil(total / limit);

    return successResponse(items, null, {
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        }
    });
}

/**
 * Create response with HTTP status
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body
 * @param {Object} headers - Additional headers
 * @returns {Object}
 */
function httpResponse(statusCode, body, headers = {}) {
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
 * Create Lambda success response
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object}
 */
function lambdaSuccess(data, statusCode = 200) {
    return httpResponse(statusCode, successResponse(data));
}

/**
 * Create Lambda error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {*} details - Error details
 * @returns {Object}
 */
function lambdaError(message, statusCode = 500, details = null) {
    return httpResponse(statusCode, errorResponse(message, statusCode, details));
}

/**
 * Build standard API response structure
 * @param {boolean} success - Success status
 * @param {*} data - Response data or error message
 * @param {Object} options - Additional options
 * @returns {Object}
 */
function apiResponse(success, data, options = {}) {
    const response = { success };

    if (success) {
        response.data = data;
        if (options.message) response.message = options.message;
        if (options.meta) response.meta = options.meta;
    } else {
        response.error = data;
        if (options.statusCode) response.statusCode = options.statusCode;
        if (options.details) response.details = options.details;
    }

    return response;
}

module.exports = {
    successResponse,
    errorResponse,
    paginatedResponse,
    httpResponse,
    lambdaSuccess,
    lambdaError,
    apiResponse
};
