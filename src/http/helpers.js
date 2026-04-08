/**
 * HTTP Helper Functions
 */

const { HTTP_STATUS } = require('./constants');

/**
 * Check if HTTP status code is successful (2xx)
 * @param {number} statusCode - HTTP status code
 * @returns {boolean}
 */
function isSuccessStatus(statusCode) {
    return statusCode >= 200 && statusCode < 300;
}

/**
 * Check if HTTP status code is client error (4xx)
 * @param {number} statusCode - HTTP status code
 * @returns {boolean}
 */
function isClientError(statusCode) {
    return statusCode >= 400 && statusCode < 500;
}

/**
 * Check if HTTP status code is server error (5xx)
 * @param {number} statusCode - HTTP status code
 * @returns {boolean}
 */
function isServerError(statusCode) {
    return statusCode >= 500 && statusCode < 600;
}

/**
 * Build query string from object
 * @param {Object} params - Query parameters object
 * @returns {string}
 */
function buildQueryString(params) {
    if (!params || Object.keys(params).length === 0) return '';

    const queryParams = Object.entries(params)
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

    return queryParams ? `?${queryParams}` : '';
}

/**
 * Parse query string to object
 * @param {string} queryString - Query string
 * @returns {Object}
 */
function parseQueryString(queryString) {
    if (!queryString) return {};

    const params = {};
    const searchParams = new URLSearchParams(queryString);

    for (const [key, value] of searchParams) {
        params[key] = value;
    }

    return params;
}

module.exports = {
    isSuccessStatus,
    isClientError,
    isServerError,
    buildQueryString,
    parseQueryString
};
