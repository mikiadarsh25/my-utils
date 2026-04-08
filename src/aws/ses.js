/**
 * AWS SES Utilities
 * Helper functions for SES email operations
 */

/**
 * Build email parameters for SES
 * @param {Object} options - Email options
 * @returns {Object}
 */
function buildEmailParams({ from, to, subject, body, replyTo, cc, bcc, isHtml = true }) {
    const params = {
        Source: from,
        Destination: {
            ToAddresses: Array.isArray(to) ? to : [to]
        },
        Message: {
            Subject: {
                Data: subject,
                Charset: 'UTF-8'
            },
            Body: {}
        }
    };

    if (isHtml) {
        params.Message.Body.Html = {
            Data: body,
            Charset: 'UTF-8'
        };
    } else {
        params.Message.Body.Text = {
            Data: body,
            Charset: 'UTF-8'
        };
    }

    if (replyTo) {
        params.ReplyToAddresses = Array.isArray(replyTo) ? replyTo : [replyTo];
    }

    if (cc) {
        params.Destination.CcAddresses = Array.isArray(cc) ? cc : [cc];
    }

    if (bcc) {
        params.Destination.BccAddresses = Array.isArray(bcc) ? bcc : [bcc];
    }

    return params;
}

/**
 * Replace template variables in email content
 * @param {string} template - Email template
 * @param {Object} variables - Variables to replace
 * @returns {string}
 */
function replaceTemplateVariables(template, variables) {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        result = result.replace(regex, value);
    }

    return result;
}

/**
 * Validate email address format
 * @param {string} email - Email address
 * @returns {boolean}
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

module.exports = {
    buildEmailParams,
    replaceTemplateVariables,
    isValidEmail
};
