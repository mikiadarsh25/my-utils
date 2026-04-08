/**
 * Uncaught Error Handler Examples
 * Automatic notification for uncaught exceptions and unhandled rejections
 */

const {
    setupUncaughtErrorHandlers,
    setupWithSlack,
    setupWithTeams,
    setupWithDiscord
} = require('../src/error');

// ========================================
// Example 1: Basic Setup with Slack
// ========================================

console.log('\n===== Example 1: Basic Slack Integration =====\n');

// Replace with your actual Slack webhook URL
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL';

if (SLACK_WEBHOOK.includes('YOUR')) {
    console.log('⚠️  Please set SLACK_WEBHOOK_URL environment variable');
    console.log('   Get webhook URL from: https://api.slack.com/messaging/webhooks');
} else {
    setupWithSlack(SLACK_WEBHOOK, {
        slackConfig: {
            channel: '#errors',
            username: 'Error Bot',
            iconEmoji: ':fire:',
            includeStackTrace: true
        },
        exitOnUncaughtException: false, // Don't exit for demo
        exitOnUnhandledRejection: false
    });

    console.log('✅ Slack integration enabled');
}

// ========================================
// Example 2: Multi-Channel Setup
// ========================================

console.log('\n===== Example 2: Multi-Channel Notifications =====\n');

const multiChannelHandler = setupUncaughtErrorHandlers({
    // Slack
    slack: SLACK_WEBHOOK.includes('YOUR') ? null : {
        webhookUrl: SLACK_WEBHOOK,
        channel: '#critical-errors',
        username: 'Critical Error Bot',
        mentionUsers: ['U123456'], // Slack user IDs to mention
        includeStackTrace: true
    },

    // Microsoft Teams
    teams: process.env.TEAMS_WEBHOOK_URL ? {
        webhookUrl: process.env.TEAMS_WEBHOOK_URL,
        includeStackTrace: true
    } : null,

    // Discord
    discord: process.env.DISCORD_WEBHOOK_URL ? {
        webhookUrl: process.env.DISCORD_WEBHOOK_URL,
        username: 'Error Monitor',
        mentionRoles: ['123456789'], // Discord role IDs
        includeStackTrace: true
    } : null,

    // Email (requires nodemailer setup)
    email: process.env.SMTP_HOST ? {
        transport: require('nodemailer').createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        }),
        from: 'errors@example.com',
        to: ['admin@example.com', 'devops@example.com'],
        subject: '[CRITICAL] Application Error',
        includeStackTrace: true
    } : null,

    // Behavior
    exitOnUncaughtException: false,
    exitOnUnhandledRejection: false,

    // Callbacks
    onUncaughtException: async (error) => {
        console.log('🔥 Uncaught exception detected:', error.message);
    },

    onUnhandledRejection: async (error, reason, promise) => {
        console.log('❌ Unhandled rejection detected:', String(reason));
    },

    onBeforeExit: async (type, error) => {
        console.log(`Application exiting due to ${type}`);
        // Cleanup logic here
    }
});

console.log('✅ Multi-channel error notifications enabled');

// ========================================
// Example 3: Custom Notifier
// ========================================

console.log('\n===== Example 3: Custom Notifier =====\n');

const customNotifier = async (error, context) => {
    console.log('\n📢 Custom Notifier Called:');
    console.log('  Error:', error.message);
    console.log('  Type:', context.type);
    console.log('  Fatal:', context.fatal);

    // Your custom notification logic
    // e.g., Send to custom API, database, etc.

    return { success: true };
};

setupUncaughtErrorHandlers({
    customNotifiers: [customNotifier],
    exitOnUncaughtException: false,
    exitOnUnhandledRejection: false
});

console.log('✅ Custom notifier enabled');

// ========================================
// Example 4: With Rate Limiting
// ========================================

console.log('\n===== Example 4: Rate-Limited Notifications =====\n');

const { integrations } = require('../src/error');

const rateLimitedSlack = integrations.createRateLimitedNotifier(
    integrations.slack.createSimpleSlackNotifier(SLACK_WEBHOOK),
    {
        maxNotifications: 5,
        windowMs: 60000, // 1 minute
        cooldownMs: 300000 // 5 minutes
    }
);

setupUncaughtErrorHandlers({
    customNotifiers: [rateLimitedSlack],
    exitOnUncaughtException: false,
    exitOnUnhandledRejection: false
});

console.log('✅ Rate-limited notifications enabled');

// ========================================
// Example 5: Conditional Notifications
// ========================================

console.log('\n===== Example 5: Conditional Notifications =====\n');

const conditionalNotifier = integrations.createConditionalNotifier(
    // Only notify for production errors
    async (error, context) => {
        return process.env.NODE_ENV === 'production' || error.statusCode >= 500;
    },
    customNotifier
);

setupUncaughtErrorHandlers({
    customNotifiers: [conditionalNotifier],
    exitOnUncaughtException: false,
    exitOnUnhandledRejection: false
});

console.log('✅ Conditional notifications enabled');

// ========================================
// Trigger Test Errors
// ========================================

console.log('\n===== Testing Error Handlers =====\n');
console.log('Triggering test errors in 2 seconds...\n');

setTimeout(() => {
    console.log('1. Testing unhandled rejection...');

    // Test unhandled rejection
    Promise.reject(new Error('Test unhandled rejection'));

    setTimeout(() => {
        console.log('\n2. Testing unhandled rejection (non-Error)...');
        Promise.reject('String rejection');

        setTimeout(() => {
            console.log('\n3. Testing uncaught exception...');
            // Uncomment to test (will crash the process if exitOnUncaughtException=true)
            // throw new Error('Test uncaught exception');

            console.log('\n✅ Error handlers tested successfully!');
            console.log('   (Uncaught exception test is commented to prevent crash)');

            // Cleanup
            setTimeout(() => {
                multiChannelHandler.cleanup();
                console.log('\n✅ Handlers cleaned up');

                // Exit gracefully
                setTimeout(() => {
                    console.log('\n👋 Example completed\n');
                    process.exit(0);
                }, 1000);
            }, 2000);

        }, 2000);
    }, 2000);
}, 2000);

// ========================================
// Production Setup Example
// ========================================

/*
// In your application entry point (index.js, server.js, app.js):

const { setupUncaughtErrorHandlers } = require('my-utils/src/error');

setupUncaughtErrorHandlers({
    // Slack for immediate alerts
    slack: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: '#prod-errors',
        mentionUsers: ['U123456', 'U789012']
    },

    // Email for detailed reports
    email: {
        transport: require('nodemailer').createTransport({
            // Your SMTP config
        }),
        from: 'errors@yourapp.com',
        to: ['oncall@yourapp.com']
    },

    // Exit behavior
    exitOnUncaughtException: true,
    exitOnUnhandledRejection: false,
    exitDelay: 2000, // Give time for notifications

    // Callbacks
    onBeforeExit: async (type, error) => {
        // Cleanup: close connections, save state, etc.
        await db.close();
        await redis.quit();
        console.log('Cleanup completed');
    }
});

// Your application code
app.listen(3000);
*/
