/**
 * Slack Integration for Error Notifications
 * Send error alerts to Slack channels
 */

const https = require('https');

/**
 * Send message to Slack webhook
 * @param {string} webhookUrl - Slack webhook URL
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
                    reject(new Error(`Slack API error: ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

/**
 * Create Slack notifier
 * @param {Object} config - Slack configuration
 * @returns {Function}
 */
function createSlackNotifier(config = {}) {
    const {
        webhookUrl,
        channel,
        username = 'Error Bot',
        iconEmoji = ':rotating_light:',
        mentionUsers = [],
        includeStackTrace = false,
        environment = process.env.NODE_ENV || 'development'
    } = config;

    if (!webhookUrl) {
        throw new Error('Slack webhook URL is required');
    }

    return async (error, context = {}) => {
        try {
            // Build error details
            const errorMessage = error.message || 'Unknown error';
            const errorName = error.name || 'Error';
            const statusCode = error.statusCode || 500;
            const timestamp = new Date().toISOString();

            // Determine color based on severity
            let color = '#FF0000'; // Red for critical
            if (statusCode < 500) color = '#FFA500'; // Orange for client errors
            if (statusCode < 400) color = '#FFFF00'; // Yellow for warnings

            // Build fields
            const fields = [
                {
                    title: 'Error Type',
                    value: errorName,
                    short: true
                },
                {
                    title: 'Status Code',
                    value: statusCode.toString(),
                    short: true
                },
                {
                    title: 'Environment',
                    value: environment,
                    short: true
                },
                {
                    title: 'Timestamp',
                    value: timestamp,
                    short: true
                }
            ];

            // Add context fields
            if (context.requestId) {
                fields.push({
                    title: 'Request ID',
                    value: context.requestId,
                    short: true
                });
            }

            if (context.userId) {
                fields.push({
                    title: 'User ID',
                    value: context.userId,
                    short: true
                });
            }

            if (context.path) {
                fields.push({
                    title: 'Path',
                    value: context.path,
                    short: true
                });
            }

            if (context.method) {
                fields.push({
                    title: 'Method',
                    value: context.method,
                    short: true
                });
            }

            // Build attachment
            const attachment = {
                color,
                fallback: `Error: ${errorMessage}`,
                pretext: mentionUsers.length > 0
                    ? mentionUsers.map(u => `<@${u}>`).join(' ')
                    : undefined,
                title: `🚨 ${errorName}`,
                text: errorMessage,
                fields,
                footer: 'Error Monitoring System',
                ts: Math.floor(Date.now() / 1000)
            };

            // Add stack trace if enabled
            if (includeStackTrace && error.stack) {
                attachment.fields.push({
                    title: 'Stack Trace',
                    value: '```' + error.stack.substring(0, 500) + '```',
                    short: false
                });
            }

            // Add error details if available
            if (error.details) {
                attachment.fields.push({
                    title: 'Details',
                    value: '```' + JSON.stringify(error.details, null, 2).substring(0, 300) + '```',
                    short: false
                });
            }

            // Build payload
            const payload = {
                username,
                icon_emoji: iconEmoji,
                attachments: [attachment]
            };

            if (channel) {
                payload.channel = channel;
            }

            // Send to Slack
            await sendToWebhook(webhookUrl, payload);

            return { success: true };

        } catch (err) {
            console.error('Failed to send Slack notification:', err);
            return { success: false, error: err.message };
        }
    };
}

/**
 * Create simple Slack notifier (text only)
 * @param {string} webhookUrl - Slack webhook URL
 * @returns {Function}
 */
function createSimpleSlackNotifier(webhookUrl) {
    return async (error, context = {}) => {
        try {
            const message = `🚨 *Error Alert*\n` +
                `*Error:* ${error.name || 'Error'}\n` +
                `*Message:* ${error.message}\n` +
                `*Status:* ${error.statusCode || 500}\n` +
                `*Time:* ${new Date().toISOString()}` +
                (context.path ? `\n*Path:* ${context.path}` : '');

            await sendToWebhook(webhookUrl, { text: message });
            return { success: true };
        } catch (err) {
            console.error('Failed to send Slack notification:', err);
            return { success: false, error: err.message };
        }
    };
}

module.exports = {
    createSlackNotifier,
    createSimpleSlackNotifier,
    sendToWebhook
};
