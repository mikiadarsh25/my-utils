/**
 * Date Utilities Module
 * Date and time manipulation helpers
 */

/**
 * Get current timestamp in ISO format
 * @returns {string}
 */
function getCurrentTimestamp() {
    return new Date().toISOString();
}

/**
 * Get current Unix timestamp (seconds)
 * @returns {number}
 */
function getUnixTimestamp() {
    return Math.floor(Date.now() / 1000);
}

/**
 * Format date to readable string
 * @param {Date|string|number} date - Date to format
 * @param {string} format - Format string (default: 'YYYY-MM-DD')
 * @returns {string}
 */
function formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

/**
 * Add days to a date
 * @param {Date|string} date - Starting date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date}
 */
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Add hours to a date
 * @param {Date|string} date - Starting date
 * @param {number} hours - Number of hours to add (can be negative)
 * @returns {Date}
 */
function addHours(date, hours) {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
}

/**
 * Check if date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean}
 */
function isPast(date) {
    return new Date(date) < new Date();
}

/**
 * Check if date is in the future
 * @param {Date|string} date - Date to check
 * @returns {boolean}
 */
function isFuture(date) {
    return new Date(date) > new Date();
}

/**
 * Get difference between two dates in days
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number}
 */
function getDaysDifference(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if date is valid
 * @param {*} date - Value to check
 * @returns {boolean}
 */
function isValidDate(date) {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d);
}

/**
 * Get start of day
 * @param {Date|string} date - Date
 * @returns {Date}
 */
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Get end of day
 * @param {Date|string} date - Date
 * @returns {Date}
 */
function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

module.exports = {
    getCurrentTimestamp,
    getUnixTimestamp,
    formatDate,
    addDays,
    addHours,
    isPast,
    isFuture,
    getDaysDifference,
    isValidDate,
    startOfDay,
    endOfDay
};
