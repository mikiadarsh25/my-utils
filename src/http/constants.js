/**
 * HTTP Constants
 * Standard HTTP methods, status codes, and common headers
 */

const HTTP_METHODS = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE',
    HEAD: 'HEAD',
    OPTIONS: 'OPTIONS'
};

const HTTP_STATUS = {
    // Success 2xx
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,

    // Redirection 3xx
    MOVED_PERMANENTLY: 301,
    FOUND: 302,
    NOT_MODIFIED: 304,

    // Client Error 4xx
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    GONE: 410,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,

    // Server Error 5xx
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504
};

const HTTP_HEADERS = {
    AUTHORIZATION: 'Authorization',
    CONTENT_TYPE: 'Content-Type',
    ACCEPT: 'Accept',
    USER_AGENT: 'User-Agent',
    CACHE_CONTROL: 'Cache-Control',
    ETAG: 'ETag',
    IF_NONE_MATCH: 'If-None-Match',
    LOCATION: 'Location',
    X_REQUEST_ID: 'X-Request-ID',
    X_CORRELATION_ID: 'X-Correlation-ID'
};

const CONTENT_TYPES = {
    JSON: 'application/json',
    XML: 'application/xml',
    HTML: 'text/html',
    TEXT: 'text/plain',
    FORM: 'application/x-www-form-urlencoded',
    MULTIPART: 'multipart/form-data',
    PDF: 'application/pdf',
    CSV: 'text/csv'
};

module.exports = {
    HTTP_METHODS,
    HTTP_STATUS,
    HTTP_HEADERS,
    CONTENT_TYPES
};
