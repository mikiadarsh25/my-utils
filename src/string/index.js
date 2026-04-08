/**
 * String Utilities Module
 * String manipulation and transformation helpers
 */

/**
 * Convert string to camelCase
 * @param {string} str - Input string
 * @returns {string}
 */
function toCamelCase(str) {
    return str
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
}

/**
 * Convert string to snake_case
 * @param {string} str - Input string
 * @returns {string}
 */
function toSnakeCase(str) {
    return str
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');
}

/**
 * Convert string to kebab-case
 * @param {string} str - Input string
 * @returns {string}
 */
function toKebabCase(str) {
    return str
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '');
}

/**
 * Convert string to PascalCase
 * @param {string} str - Input string
 * @returns {string}
 */
function toPascalCase(str) {
    const camelCase = toCamelCase(str);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}

/**
 * Capitalize first letter of string
 * @param {string} str - Input string
 * @returns {string}
 */
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate string to specified length
 * @param {string} str - Input string
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string}
 */
function truncate(str, length, suffix = '...') {
    if (!str || str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
}

/**
 * Generate random string
 * @param {number} length - Length of random string
 * @param {string} chars - Characters to use (default: alphanumeric)
 * @returns {string}
 */
function randomString(length = 10, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Generate slug from string
 * @param {string} str - Input string
 * @returns {string}
 */
function slugify(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Check if string is empty or whitespace
 * @param {string} str - Input string
 * @returns {boolean}
 */
function isEmpty(str) {
    return !str || str.trim().length === 0;
}

/**
 * Replace placeholders in template string
 * @param {string} template - Template string with {{key}} placeholders
 * @param {Object} values - Values to replace
 * @returns {string}
 */
function interpolate(template, values) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return values.hasOwnProperty(key) ? values[key] : match;
    });
}

/**
 * Remove special characters from string
 * @param {string} str - Input string
 * @param {string} keep - Characters to keep (default: alphanumeric and space)
 * @returns {string}
 */
function removeSpecialChars(str, keep = 'a-zA-Z0-9\\s') {
    const regex = new RegExp(`[^${keep}]`, 'g');
    return str.replace(regex, '');
}

module.exports = {
    toCamelCase,
    toSnakeCase,
    toKebabCase,
    toPascalCase,
    capitalize,
    truncate,
    randomString,
    slugify,
    isEmpty,
    interpolate,
    removeSpecialChars
};
