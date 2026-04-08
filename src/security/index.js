/**
 * Security Utilities Module
 * Security-related helpers for encryption, hashing, and sanitization
 */

const crypto = require('crypto');

/**
 * Generate random UUID v4
 * @returns {string}
 */
function generateUUID() {
    return crypto.randomUUID();
}

/**
 * Generate random token
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string}
 */
function generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash string using SHA256
 * @param {string} data - Data to hash
 * @returns {string}
 */
function hashSHA256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hash string using MD5
 * @param {string} data - Data to hash
 * @returns {string}
 */
function hashMD5(data) {
    return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Create HMAC signature
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @param {string} algorithm - Hash algorithm (default: 'sha256')
 * @returns {string}
 */
function createHMAC(data, secret, algorithm = 'sha256') {
    return crypto.createHmac(algorithm, secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 * @param {string} data - Original data
 * @param {string} signature - Signature to verify
 * @param {string} secret - Secret key
 * @param {string} algorithm - Hash algorithm (default: 'sha256')
 * @returns {boolean}
 */
function verifyHMAC(data, signature, secret, algorithm = 'sha256') {
    const expectedSignature = createHMAC(data, secret, algorithm);
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

/**
 * Encrypt data using AES-256-GCM
 * @param {string} data - Data to encrypt
 * @param {string} key - Encryption key (32 bytes)
 * @returns {Object} - { encrypted, iv, tag }
 */
function encrypt(data, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
    };
}

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encrypted - Encrypted data
 * @param {string} key - Encryption key (32 bytes)
 * @param {string} iv - Initialization vector
 * @param {string} tag - Authentication tag
 * @returns {string}
 */
function decrypt(encrypted, key, iv, tag) {
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(key, 'hex'),
        Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Encode data to Base64
 * @param {string} data - Data to encode
 * @returns {string}
 */
function base64Encode(data) {
    return Buffer.from(data).toString('base64');
}

/**
 * Decode Base64 data
 * @param {string} data - Base64 encoded data
 * @returns {string}
 */
function base64Decode(data) {
    return Buffer.from(data, 'base64').toString('utf8');
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} html - HTML string
 * @returns {string}
 */
function sanitizeHTML(html) {
    if (!html) return '';

    return html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Mask sensitive data (e.g., email, phone, card number)
 * @param {string} data - Data to mask
 * @param {number} visibleStart - Characters visible at start (default: 2)
 * @param {number} visibleEnd - Characters visible at end (default: 2)
 * @param {string} maskChar - Masking character (default: '*')
 * @returns {string}
 */
function maskSensitiveData(data, visibleStart = 2, visibleEnd = 2, maskChar = '*') {
    if (!data || data.length <= visibleStart + visibleEnd) {
        return data;
    }

    const start = data.substring(0, visibleStart);
    const end = data.substring(data.length - visibleEnd);
    const masked = maskChar.repeat(data.length - visibleStart - visibleEnd);

    return `${start}${masked}${end}`;
}

module.exports = {
    generateUUID,
    generateToken,
    hashSHA256,
    hashMD5,
    createHMAC,
    verifyHMAC,
    encrypt,
    decrypt,
    base64Encode,
    base64Decode,
    sanitizeHTML,
    maskSensitiveData
};
