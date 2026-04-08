/**
 * Microsoft Teams Integration for Error Notifications
 * Send error alerts to Teams channels via webhooks
 */

const https = require('https');

/**
 * Send message to Teams webhook
 * @param {string} webhookUrl - Teams webhook URL
 * @param {Object} payload - Message payload
 * @returns {Promise}
 */
async function sendToWebhook(webhookUrl, payload) {
    return new Promise((resolve, reject) => {
        const url = new URL(webhookUrl);
        const data = JSON.stringify(payload);

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ success: true, body });
                } else {
                    reject(new Error(`Teams API error: ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

/**
 * Create Teams notifier
 * @param {Object} config - Teams configuration
 * @returns {Function}
 */
function createTeamsNotifier(config = {}) {
    const {
        webhookUrl,
        includeStackTrace = false,
        environment = process.env.NODE_ENV || 'development'
    } = config;

    if (!webhookUrl) {
        throw new Error('Teams webhook URL is required');
    }

    return async (error, context = {}) => {
        try {
            const errorMessage = error.message || 'Unknown error';
            const errorName = error.name || 'Error';
            const statusCode = error.statusCode || 500;
            const timestamp = new Date().toISOString();

            // Determine theme color based on severity
            let themeColor = 'FF0000'; // Red for critical
            if (statusCode < 500) themeColor = 'FFA500'; // Orange for client errors
            if (statusCode < 400) themeColor = 'FFFF00'; // Yellow for warnings

            // Build facts
            const facts = [
                { name: 'Error Type', value: errorName },
                { name: 'Status Code', value: statusCode.toString() },
                { name: 'Environment', value: environment },
                { name: 'Timestamp', value: timestamp }
            ];

            if (context.requestId) {
                facts.push({ name: 'Request ID', value: context.requestId });
            }

            if (context.userId) {
                facts.push({ name: 'User ID', value: context.userId });
            }

            if (context.path) {
                facts.push({ name: 'Path', value: context.path });
            }

            if (context.method) {
                facts.push({ name: 'Method', value: context.method });
            }

            // Build sections
            const sections = [
                {
                    activityTitle: `🚨 ${errorName}`,
                    activitySubtitle: errorMessage,
                    facts
                }
            ];

            // Add stack trace section if enabled
            if (includeStackTrace && error.stack) {
                sections.push({
                    activityTitle: 'Stack Trace',
                    text: '```\n' + error.stack.substring(0, 500) + '\n```'
                });
            }

            // Add error details if available
            if (error.details) {
                sections.push({
                    activityTitle: 'Error Details',
                    text: '```\n' + JSON.stringify(error.details, null, 2).substring(0, 300) + '\n```'
                });
            }

            // Build card payload
            const payload = {
                '@type': 'MessageCard',
                '@context': 'http://schema.org/extensions',
                themeColor,
                summary: `Error: ${errorMessage}`,
                sections
            };

            // Send to Teams
            await sendToWebhook(webhookUrl, payload);

            return { success: true };

        } catch (err) {
            console.error('Failed to send Teams notification:', err);
            return { success: false, error: err.message };
        }
    };
}

/**
 * Create simple Teams notifier (text only)
 * @param {string} webhookUrl - Teams webhook URL
 * @returns {Function}
 */
function createSimpleTeamsNotifier(webhookUrl) {
    return async (error, context = {}) => {
        try {
            const message = `**Error Alert**\n\n` +
                `**Error:** ${error.name || 'Error'}\n` +
                `**Message:** ${error.message}\n` +
                `**Status:** ${error.statusCode || 500}\n` +
                `**Time:** ${new Date().toISOString()}` +
                (context.path ? `\n**Path:** ${context.path}` : '');

            const payload = {
                text: message
            };

            await sendToWebhook(webhookUrl, payload);
            return { success: true };
        } catch (err) {
            console.error('Failed to send Teams notification:', err);
            return { success: false, error: err.message };
        }
    };
}

module.exports = {
    createTeamsNotifier,
    createSimpleTeamsNotifier,
    sendToWebhook
};
