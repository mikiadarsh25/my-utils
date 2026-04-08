/**
 * Email Integration for Error Notifications
 * Send error alerts via email using nodemailer or AWS SES
 */

/**
 * Create email notifier using nodemailer
 * @param {Object} config - Email configuration
 * @returns {Function}
 */
function createEmailNotifier(config = {}) {
    const {
        transport, // nodemailer transport
        from,
        to,
        cc,
        subject = '[Error Alert] Application Error',
        includeStackTrace = true,
        environment = process.env.NODE_ENV || 'development'
    } = config;

    if (!transport) {
        throw new Error('Email transport is required (nodemailer)');
    }

    if (!to || (Array.isArray(to) && to.length === 0)) {
        throw new Error('Email recipient(s) required');
    }

    return async (error, context = {}) => {
        try {
            const errorMessage = error.message || 'Unknown error';
            const errorName = error.name || 'Error';
            const statusCode = error.statusCode || 500;
            const timestamp = new Date().toISOString();

            // Build HTML email
            const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f44336; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .footer { background: #333; color: white; padding: 10px; text-align: center; border-radius: 0 0 5px 5px; }
        .error-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #f44336; }
        .details { background: #fff; padding: 15px; margin: 10px 0; border: 1px solid #ddd; }
        .label { font-weight: bold; color: #666; }
        .value { color: #333; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 3px; overflow-x: auto; }
        .critical { color: #f44336; }
        .warning { color: #ff9800; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 Error Alert</h1>
        </div>
        <div class="content">
            <div class="error-box">
                <h2 class="${statusCode >= 500 ? 'critical' : 'warning'}">${errorName}</h2>
                <p>${errorMessage}</p>
            </div>

            <div class="details">
                <p><span class="label">Status Code:</span> <span class="value">${statusCode}</span></p>
                <p><span class="label">Environment:</span> <span class="value">${environment}</span></p>
                <p><span class="label">Timestamp:</span> <span class="value">${timestamp}</span></p>
                ${context.requestId ? `<p><span class="label">Request ID:</span> <span class="value">${context.requestId}</span></p>` : ''}
                ${context.userId ? `<p><span class="label">User ID:</span> <span class="value">${context.userId}</span></p>` : ''}
                ${context.path ? `<p><span class="label">Path:</span> <span class="value">${context.method || ''} ${context.path}</span></p>` : ''}
                ${context.ip ? `<p><span class="label">IP Address:</span> <span class="value">${context.ip}</span></p>` : ''}
            </div>

            ${error.details ? `
            <div class="details">
                <h3>Error Details</h3>
                <pre>${JSON.stringify(error.details, null, 2)}</pre>
            </div>
            ` : ''}

            ${includeStackTrace && error.stack ? `
            <div class="details">
                <h3>Stack Trace</h3>
                <pre>${error.stack}</pre>
            </div>
            ` : ''}
        </div>
        <div class="footer">
            <p>Error Monitoring System</p>
        </div>
    </div>
</body>
</html>
            `;

            // Build text version
            const text = `
ERROR ALERT
===========

Error: ${errorName}
Message: ${errorMessage}
Status Code: ${statusCode}
Environment: ${environment}
Timestamp: ${timestamp}
${context.requestId ? `Request ID: ${context.requestId}\n` : ''}
${context.userId ? `User ID: ${context.userId}\n` : ''}
${context.path ? `Path: ${context.method || ''} ${context.path}\n` : ''}
${context.ip ? `IP: ${context.ip}\n` : ''}

${error.details ? `\nDetails:\n${JSON.stringify(error.details, null, 2)}\n` : ''}
${includeStackTrace && error.stack ? `\nStack Trace:\n${error.stack}\n` : ''}
            `.trim();

            // Send email
            const mailOptions = {
                from: from || 'noreply@example.com',
                to: Array.isArray(to) ? to.join(', ') : to,
                cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
                subject: `${subject} - ${errorName}`,
                text,
                html
            };

            await transport.sendMail(mailOptions);

            return { success: true };

        } catch (err) {
            console.error('Failed to send email notification:', err);
            return { success: false, error: err.message };
        }
    };
}

/**
 * Create AWS SES email notifier
 * @param {Object} config - SES configuration
 * @returns {Function}
 */
function createSESNotifier(config = {}) {
    const {
        sesClient, // AWS SES client instance
        from,
        to,
        cc,
        subject = '[Error Alert] Application Error',
        includeStackTrace = true
    } = config;

    if (!sesClient) {
        throw new Error('AWS SES client is required');
    }

    return async (error, context = {}) => {
        try {
            // Reuse the email notifier logic
            const notifier = createEmailNotifier({
                transport: {
                    sendMail: async (mailOptions) => {
                        // Convert to SES format
                        const params = {
                            Source: mailOptions.from,
                            Destination: {
                                ToAddresses: mailOptions.to.split(',').map(e => e.trim())
                            },
                            Message: {
                                Subject: {
                                    Data: mailOptions.subject
                                },
                                Body: {
                                    Text: { Data: mailOptions.text },
                                    Html: { Data: mailOptions.html }
                                }
                            }
                        };

                        if (mailOptions.cc) {
                            params.Destination.CcAddresses = mailOptions.cc.split(',').map(e => e.trim());
                        }

                        return await sesClient.sendEmail(params).promise();
                    }
                },
                from,
                to,
                cc,
                subject,
                includeStackTrace
            });

            return await notifier(error, context);

        } catch (err) {
            console.error('Failed to send SES notification:', err);
            return { success: false, error: err.message };
        }
    };
}

module.exports = {
    createEmailNotifier,
    createSESNotifier
};
