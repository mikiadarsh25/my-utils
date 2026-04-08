/**
 * Discord Integration for Error Notifications
 * Send error alerts to Discord channels via webhooks
 */

const https = require('https');

/**
 * Send message to Discord webhook
 * @param {string} webhookUrl - Discord webhook URL
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
                    reject(new Error(`Discord API error: ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

/**
 * Create Discord notifier
 * @param {Object} config - Discord configuration
 * @returns {Function}
 */
function createDiscordNotifier(config = {}) {
    const {
        webhookUrl,
        username = 'Error Bot',
        avatarUrl,
        mentionRoles = [],
        includeStackTrace = false,
        environment = process.env.NODE_ENV || 'development'
    } = config;

    if (!webhookUrl) {
        throw new Error('Discord webhook URL is required');
    }

    return async (error, context = {}) => {
        try {
            const errorMessage = error.message || 'Unknown error';
            const errorName = error.name || 'Error';
            const statusCode = error.statusCode || 500;
            const timestamp = new Date().toISOString();

            // Determine color based on severity (Discord uses decimal colors)
            let color = 16711680; // Red for critical (0xFF0000)
            if (statusCode < 500) color = 16753920; // Orange (0xFFA500)
            if (statusCode < 400) color = 16776960; // Yellow (0xFFFF00)

            // Build embed fields
            const fields = [
                {
                    name: 'Error Type',
                    value: errorName,
                    inline: true
                },
                {
                    name: 'Status Code',
                    value: statusCode.toString(),
                    inline: true
                },
                {
                    name: 'Environment',
                    value: environment,
                    inline: true
                }
            ];

            if (context.requestId) {
                fields.push({
                    name: 'Request ID',
                    value: context.requestId,
                    inline: true
                });
            }

            if (context.userId) {
                fields.push({
                    name: 'User ID',
                    value: context.userId,
                    inline: true
                });
            }

            if (context.path) {
                fields.push({
                    name: 'Path',
                    value: context.path,
                    inline: true
                });
            }

            if (context.method) {
                fields.push({
                    name: 'Method',
                    value: context.method,
                    inline: true
                });
            }

            // Build embed
            const embed = {
                title: `🚨 ${errorName}`,
                description: errorMessage,
                color,
                fields,
                timestamp,
                footer: {
                    text: 'Error Monitoring System'
                }
            };

            // Add stack trace if enabled
            if (includeStackTrace && error.stack) {
                const stackTrace = error.stack.substring(0, 1000);
                embed.fields.push({
                    name: 'Stack Trace',
                    value: '```\n' + stackTrace + '\n```',
                    inline: false
                });
            }

            // Add error details if available
            if (error.details) {
                const details = JSON.stringify(error.details, null, 2).substring(0, 500);
                embed.fields.push({
                    name: 'Details',
                    value: '```json\n' + details + '\n```',
                    inline: false
                });
            }

            // Build payload
            const payload = {
                username,
                embeds: [embed]
            };

            if (avatarUrl) {
                payload.avatar_url = avatarUrl;
            }

            // Add role mentions
            if (mentionRoles.length > 0) {
                payload.content = mentionRoles.map(role => `<@&${role}>`).join(' ');
            }

            // Send to Discord
            await sendToWebhook(webhookUrl, payload);

            return { success: true };

        } catch (err) {
            console.error('Failed to send Discord notification:', err);
            return { success: false, error: err.message };
        }
    };
}

/**
 * Create simple Discord notifier (text only)
 * @param {string} webhookUrl - Discord webhook URL
 * @returns {Function}
 */
function createSimpleDiscordNotifier(webhookUrl) {
    return async (error, context = {}) => {
        try {
            const message = `🚨 **Error Alert**\n` +
                `**Error:** ${error.name || 'Error'}\n` +
                `**Message:** ${error.message}\n` +
                `**Status:** ${error.statusCode || 500}\n` +
                `**Time:** ${new Date().toISOString()}` +
                (context.path ? `\n**Path:** ${context.path}` : '');

            await sendToWebhook(webhookUrl, { content: message });
            return { success: true };
        } catch (err) {
            console.error('Failed to send Discord notification:', err);
            return { success: false, error: err.message };
        }
    };
}

module.exports = {
    createDiscordNotifier,
    createSimpleDiscordNotifier,
    sendToWebhook
};
