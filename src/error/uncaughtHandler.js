/**
 * Uncaught Exception and Unhandled Rejection Handler
 * Automatically catch and report uncaught errors
 */

const { createLogger } = require('../logger');
const { createGlobalErrorHandler } = require('./globalHandler');

/**
 * Setup uncaught error handlers
 * @param {Object} config - Handler configuration
 * @returns {Object} - Handler instance and cleanup function
 */
function setupUncaughtErrorHandlers(config = {}) {
    const {
        // Global error handler config
        errorHandler,

        // Notification services
        slack,
        teams,
        discord,
        email,
        customNotifiers = [],

        // Exit behavior
        exitOnUncaughtException = true,
        exitOnUnhandledRejection = false,
        exitDelay = 1000,

        // Logging
        logger,
        enableLogging = true,

        // Callbacks
        onUncaughtException,
        onUnhandledRejection,
        onBeforeExit
    } = config;

    const log = logger || createLogger({ service: 'uncaught-handler' });

    // Create or use provided error handler
    const handler = errorHandler || createGlobalErrorHandler({
        enableLogging,
        logger: log,
        environment: process.env.NODE_ENV || 'development'
    });

    // Collect all notifiers
    const allNotifiers = [...customNotifiers];

    if (slack) {
        const { createSlackNotifier } = require('./integrations/slack');
        allNotifiers.push(createSlackNotifier(slack));
    }

    if (teams) {
        const { createTeamsNotifier } = require('./integrations/teams');
        allNotifiers.push(createTeamsNotifier(teams));
    }

    if (discord) {
        const { createDiscordNotifier } = require('./integrations/discord');
        allNotifiers.push(createDiscordNotifier(discord));
    }

    if (email) {
        const { createEmailNotifier } = require('./integrations/email');
        allNotifiers.push(createEmailNotifier(email));
    }

    /**
     * Send notifications to all services
     */
    async function sendNotifications(error, context) {
        const promises = allNotifiers.map(notifier =>
            notifier(error, context).catch(err => {
                log.error('Notifier failed', err);
                return { success: false, error: err.message };
            })
        );

        return await Promise.allSettled(promises);
    }

    /**
     * Handle uncaught exception
     */
    const uncaughtExceptionHandler = async (error) => {
        try {
            log.error('🔥 UNCAUGHT EXCEPTION - Application will exit', error, {
                type: 'uncaughtException',
                pid: process.pid,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                platform: process.platform,
                nodeVersion: process.version
            });

            // Custom callback
            if (onUncaughtException) {
                await onUncaughtException(error);
            }

            // Handle error
            await handler.handle(error, {
                type: 'uncaughtException',
                fatal: true
            });

            // Send notifications
            await sendNotifications(error, {
                type: 'uncaughtException',
                fatal: true,
                willExit: exitOnUncaughtException
            });

            // Exit if configured
            if (exitOnUncaughtException) {
                if (onBeforeExit) {
                    await onBeforeExit('uncaughtException', error);
                }

                setTimeout(() => {
                    process.exit(1);
                }, exitDelay);
            }

        } catch (handlerError) {
            console.error('Error in uncaught exception handler:', handlerError);
            if (exitOnUncaughtException) {
                setTimeout(() => process.exit(1), exitDelay);
            }
        }
    };

    /**
     * Handle unhandled rejection
     */
    const unhandledRejectionHandler = async (reason, promise) => {
        try {
            const error = reason instanceof Error ? reason : new Error(String(reason));

            log.error('❌ UNHANDLED REJECTION', error, {
                type: 'unhandledRejection',
                reason: String(reason),
                pid: process.pid,
                uptime: process.uptime()
            });

            // Custom callback
            if (onUnhandledRejection) {
                await onUnhandledRejection(error, reason, promise);
            }

            // Handle error
            await handler.handle(error, {
                type: 'unhandledRejection',
                reason: String(reason)
            });

            // Send notifications
            await sendNotifications(error, {
                type: 'unhandledRejection',
                fatal: exitOnUnhandledRejection,
                willExit: exitOnUnhandledRejection
            });

            // Exit if configured
            if (exitOnUnhandledRejection) {
                if (onBeforeExit) {
                    await onBeforeExit('unhandledRejection', error);
                }

                setTimeout(() => {
                    process.exit(1);
                }, exitDelay);
            }

        } catch (handlerError) {
            console.error('Error in unhandled rejection handler:', handlerError);
            if (exitOnUnhandledRejection) {
                setTimeout(() => process.exit(1), exitDelay);
            }
        }
    };

    /**
     * Handle warning
     */
    const warningHandler = (warning) => {
        log.warn('⚠️  Node.js Warning', {
            name: warning.name,
            message: warning.message,
            stack: warning.stack
        });
    };

    // Attach handlers
    process.on('uncaughtException', uncaughtExceptionHandler);
    process.on('unhandledRejection', unhandledRejectionHandler);
    process.on('warning', warningHandler);

    // Log that handlers are active
    log.info('Uncaught error handlers activated', {
        exitOnUncaughtException,
        exitOnUnhandledRejection,
        notifiers: allNotifiers.length
    });

    /**
     * Cleanup function
     */
    const cleanup = () => {
        process.off('uncaughtException', uncaughtExceptionHandler);
        process.off('unhandledRejection', unhandledRejectionHandler);
        process.off('warning', warningHandler);
        log.info('Uncaught error handlers removed');
    };

    return {
        handler,
        cleanup,
        sendNotifications
    };
}

/**
 * Setup with simple configuration
 * @param {string} slackWebhook - Slack webhook URL
 * @param {Object} options - Additional options
 * @returns {Object}
 */
function setupWithSlack(slackWebhook, options = {}) {
    return setupUncaughtErrorHandlers({
        ...options,
        slack: {
            webhookUrl: slackWebhook,
            ...options.slackConfig
        }
    });
}

/**
 * Setup with Teams configuration
 * @param {string} teamsWebhook - Teams webhook URL
 * @param {Object} options - Additional options
 * @returns {Object}
 */
function setupWithTeams(teamsWebhook, options = {}) {
    return setupUncaughtErrorHandlers({
        ...options,
        teams: {
            webhookUrl: teamsWebhook,
            ...options.teamsConfig
        }
    });
}

/**
 * Setup with Discord configuration
 * @param {string} discordWebhook - Discord webhook URL
 * @param {Object} options - Additional options
 * @returns {Object}
 */
function setupWithDiscord(discordWebhook, options = {}) {
    return setupUncaughtErrorHandlers({
        ...options,
        discord: {
            webhookUrl: discordWebhook,
            ...options.discordConfig
        }
    });
}

module.exports = {
    setupUncaughtErrorHandlers,
    setupWithSlack,
    setupWithTeams,
    setupWithDiscord
};
