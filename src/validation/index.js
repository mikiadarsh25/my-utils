/**
 * Validation Utilities Module
 * Input validation and sanitization helpers
 */

// Export Joi validation if available
let joiValidation;
try {
    joiValidation = require('./joi');
} catch (error) {
    // Joi not installed, skip
    joiValidation = null;
}

/**
 * Validate email address
 * @param {string} email - Email address to validate
 * @returns {boolean}
 */
function validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validate phone number (basic international format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
function validatePhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
    return phoneRegex.test(phone.trim());
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
function validateURL(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate UUID
 * @param {string} uuid - UUID to validate
 * @returns {boolean}
 */
function validateUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Validate required fields in an object
 * @param {Object} data - Data object
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Object} - { valid: boolean, missing: Array<string> }
 */
function validateRequiredFields(data, requiredFields) {
    const missing = [];

    for (const field of requiredFields) {
        if (!data[field] || data[field] === '') {
            missing.push(field);
        }
    }

    return {
        valid: missing.length === 0,
        missing
    };
}

/**
 * Sanitize string input (remove potential XSS)
 * @param {string} input - Input string
 * @returns {string}
 */
function sanitizeString(input) {
    if (!input || typeof input !== 'string') return '';

    return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
}

/**
 * Validate and sanitize object keys
 * @param {Object} obj - Object to validate
 * @param {Array<string>} allowedKeys - Array of allowed keys
 * @returns {Object}
 */
function sanitizeObject(obj, allowedKeys) {
    const sanitized = {};

    for (const key of allowedKeys) {
        if (obj.hasOwnProperty(key)) {
            sanitized[key] = obj[key];
        }
    }

    return sanitized;
}

/**
 * Validate number range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean}
 */
function validateNumberRange(value, min, max) {
    if (typeof value !== 'number' || isNaN(value)) return false;
    return value >= min && value <= max;
}

/**
 * Validate string length
 * @param {string} str - String to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @returns {boolean}
 */
function validateStringLength(str, minLength, maxLength) {
    if (!str || typeof str !== 'string') return false;
    const length = str.trim().length;
    return length >= minLength && length <= maxLength;
}

module.exports = {
    validateEmail,
    validatePhone,
    validateURL,
    validateUUID,
    validateRequiredFields,
    sanitizeString,
    sanitizeObject,
    validateNumberRange,
    validateStringLength,
    // Joi validation (if installed)
    ...(joiValidation || {})
};
