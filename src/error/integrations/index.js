/**
 * Error Notification Integrations
 * Support for Slack, Teams, Discord, Email, and more
 */

const slack = require('./slack');
const teams = require('./teams');
const discord = require('./discord');
const email = require('./email');

/**
 * Create multi-channel notifier
 * Sends notifications to multiple services
 * @param {Array} notifiers - Array of notifier functions
 * @returns {Function}
 */
function createMultiChannelNotifier(notifiers = []) {
    return async (error, context = {}) => {
        const results = [];

        for (const notifier of notifiers) {
            try {
                const result = await notifier(error, context);
                results.push(result);
            } catch (err) {
                console.error('Notifier failed:', err);
                results.push({ success: false, error: err.message });
            }
        }

        return {
            success: results.some(r => r.success),
            results
        };
    };
}

/**
 * Create conditional notifier
 * Only notify based on condition
 * @param {Function} condition - Condition function
 * @param {Function} notifier - Notifier function
 * @returns {Function}
 */
function createConditionalNotifier(condition, notifier) {
    return async (error, context = {}) => {
        if (await condition(error, context)) {
            return await notifier(error, context);
        }
        return { success: true, skipped: true };
    };
}

/**
 * Create rate-limited notifier
 * Prevent notification spam
 * @param {Function} notifier - Notifier function
 * @param {Object} options - Rate limit options
 * @returns {Function}
 */
function createRateLimitedNotifier(notifier, options = {}) {
    const {
        maxNotifications = 10,
        windowMs = 60000, // 1 minute
        cooldownMs = 300000 // 5 minutes after limit
    } = options;

    let notifications = [];
    let inCooldown = false;
    let cooldownEnd = null;

    return async (error, context = {}) => {
        const now = Date.now();

        // Check if in cooldown
        if (inCooldown) {
            if (now < cooldownEnd) {
                return { success: false, rateLimited: true, cooldownEnd };
            }
            // Cooldown expired
            inCooldown = false;
            notifications = [];
        }

        // Remove old notifications outside window
        notifications = notifications.filter(time => now - time < windowMs);

        // Check if rate limit exceeded
        if (notifications.length >= maxNotifications) {
            inCooldown = true;
            cooldownEnd = now + cooldownMs;

            // Send one final notification about rate limiting
            try {
                await notifier(
                    new Error('Error notification rate limit exceeded'),
                    { ...context, rateLimitExceeded: true }
                );
            } catch (err) {
                // Ignore error
            }

            return { success: false, rateLimited: true, cooldownEnd };
        }

        // Add to notifications and send
        notifications.push(now);
        return await notifier(error, context);
    };
}

/**
 * Create batched notifier
 * Batch multiple errors into single notification
 * @param {Function} notifier - Notifier function
 * @param {Object} options - Batch options
 * @returns {Function}
 */
function createBatchedNotifier(notifier, options = {}) {
    const {
        batchSize = 5,
        batchTimeoutMs = 30000
    } = options;

    let batch = [];
    let timeoutId = null;

    const sendBatch = async () => {
        if (batch.length === 0) return;

        const errors = [...batch];
        batch = [];

        const batchError = new Error(`Batch of ${errors.length} errors`);
        batchError.batch = errors;

        try {
            await notifier(batchError, { batched: true });
        } catch (err) {
            console.error('Failed to send batch notification:', err);
        }
    };

    return async (error, context = {}) => {
        batch.push({ error, context, timestamp: new Date().toISOString() });

        // Clear existing timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        // Send immediately if batch size reached
        if (batch.length >= batchSize) {
            await sendBatch();
        } else {
            // Schedule batch send
            timeoutId = setTimeout(sendBatch, batchTimeoutMs);
        }

        return { success: true, batched: true, batchSize: batch.length };
    };
}

module.exports = {
    // Service integrations
    slack,
    teams,
    discord,
    email,

    // Notifier utilities
    createMultiChannelNotifier,
    createConditionalNotifier,
    createRateLimitedNotifier,
    createBatchedNotifier
};
