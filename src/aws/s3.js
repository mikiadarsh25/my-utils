/**
 * AWS S3 Utilities
 * Helper functions for S3 operations
 */

/**
 * Build S3 key path
 * @param {...string} parts - Path parts
 * @returns {string}
 */
function buildS3Key(...parts) {
    return parts
        .filter(part => part && part.trim())
        .join('/')
        .replace(/\/+/g, '/');
}

/**
 * Parse S3 URI
 * @param {string} s3Uri - S3 URI (s3://bucket/key)
 * @returns {Object}
 */
function parseS3Uri(s3Uri) {
    const match = s3Uri.match(/^s3:\/\/([^\/]+)\/(.+)$/);
    if (!match) {
        throw new Error('Invalid S3 URI format');
    }

    return {
        bucket: match[1],
        key: match[2]
    };
}

/**
 * Generate S3 URI
 * @param {string} bucket - Bucket name
 * @param {string} key - Object key
 * @returns {string}
 */
function generateS3Uri(bucket, key) {
    return `s3://${bucket}/${key}`;
}

/**
 * Extract file extension from S3 key
 * @param {string} key - S3 object key
 * @returns {string}
 */
function getFileExtension(key) {
    const match = key.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : '';
}

/**
 * Get content type from file extension
 * @param {string} extension - File extension
 * @returns {string}
 */
function getContentType(extension) {
    const contentTypes = {
        'json': 'application/json',
        'xml': 'application/xml',
        'pdf': 'application/pdf',
        'csv': 'text/csv',
        'txt': 'text/plain',
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'zip': 'application/zip'
    };

    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
}

module.exports = {
    buildS3Key,
    parseS3Uri,
    generateS3Uri,
    getFileExtension,
    getContentType
};
