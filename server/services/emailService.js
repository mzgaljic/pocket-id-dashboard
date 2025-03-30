// server/services/emailService.js
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Default configuration
const DEFAULT_CONFIG = {
    maxRetries: 3,
    initialRetryDelay: 1000, // 1 second
    secure: false
};

// Create a transporter instance
let transporter = null;

/**
 * Initialize the email service with configuration from environment variables
 * @returns {Promise<boolean>} - Success status
 */
function initializeEmailService() {
    return new Promise((resolve, reject) => {
        try {
            // Check for required environment variables
            if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
                logger.warn('Email service not configured: Missing SMTP_HOST or SMTP_PORT');
                return resolve(false);
            }

            // Configure the transporter
            const config = {
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT, 10),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USERNAME,
                    pass: process.env.SMTP_PASSWORD
                }
            };

            // Add TLS configuration if specified
            if (process.env.SMTP_TLS_CIPHERS) {
                config.tls = {
                    ciphers: process.env.SMTP_TLS_CIPHERS
                };
            }

            logger.info('Initializing email service', {
                host: config.host,
                port: config.port,
                secure: config.secure,
                username: config.auth.user ? '[SET]' : '[NOT SET]',
                password: config.auth.pass ? '[SET]' : '[NOT SET',
                tlsConfig: config.tls ? '[SET]' : '[NOT SET]'
            });

            transporter = nodemailer.createTransport(config);

            // Verify connection configuration
            transporter.verify(function(error, success) {
                if (error) {
                    logger.error('Email service verification failed', error);
                    resolve(false);
                } else {
                    logger.info('Email service ready to send messages');
                    resolve(true);
                }
            });
        } catch (error) {
            logger.error('Failed to initialize email service', error);
            resolve(false);
        }
    });
}

/**
 * Send an email with retry mechanism
 * @param {Object} options - Email options (to, subject, text, html)
 * @param {number} retryCount - Current retry count (internal use)
 * @returns {Promise<boolean>} - Success status
 */
async function sendEmail(options, retryCount = 0) {
    // Check if email service is initialized
    if (!transporter) {
        const initialized = initializeEmailService();
        if (!initialized) {
            logger.error('Cannot send email: Email service not initialized');
            return false;
        }
    }

    // Get max retries from env or use default
    const maxRetries = parseInt(process.env.SMTP_SEND_MAX_RETRIES, 10) || DEFAULT_CONFIG.maxRetries;

    try {
        // Prepare email data
        const mailOptions = {
            from: `"${process.env.SMTP_NAME || 'Pocket-ID Dashboard'}" <${process.env.SMTP_FROM_EMAIL || 'dashboard@example.com'}>`,
            replyTo: process.env.SMTP_REPLY_EMAIL || process.env.SMTP_FROM_EMAIL || 'dashboard@example.com',
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html
        };

        logger.info('Sending email', {
            to: mailOptions.to,
            subject: mailOptions.subject,
            attempt: retryCount + 1,
            maxRetries
        });

        // Send the email
        const info = await transporter.sendMail(mailOptions);

        logger.info('Email sent successfully', {
            messageId: info.messageId,
            to: mailOptions.to
        });

        return true;
    } catch (error) {
        logger.error(`Failed to send email (attempt ${retryCount + 1}/${maxRetries})`, error);

        // Check if we should retry
        if (retryCount < maxRetries - 1) {
            // Calculate delay with exponential backoff
            const delay = DEFAULT_CONFIG.initialRetryDelay * Math.pow(2, retryCount);

            logger.info(`Retrying email in ${delay}ms (attempt ${retryCount + 2}/${maxRetries})`);

            // Wait and retry
            return new Promise(resolve => {
                setTimeout(async () => {
                    const result = await sendEmail(options, retryCount + 1);
                    resolve(result);
                }, delay);
            });
        }

        return false;
    }
}

/**
 * Send an access request notification to the admin
 * @param {Object} requestDetails - Details about the access request
 * @returns {Promise<boolean>} - Success status
 */
async function sendAccessRequestNotification(requestDetails) {
    if (!process.env.ADMIN_EMAIL) {
        logger.warn('Cannot send access request notification: ADMIN_EMAIL not configured');
        return false;
    }

    const { appId, appName, userId, userEmail, userName, timestamp } = requestDetails;

    const subject = `Access Request: ${userName} requested access to ${appName}`;

    const text = `
Access Request Details:
----------------------
User: ${userName} (${userEmail})
User ID: ${userId}
Application: ${appName}
Application ID: ${appId}
Requested at: ${new Date(timestamp).toLocaleString()}

Please review this request and grant access if appropriate.
  `;

    const html = `
<h2>Access Request Details</h2>
<table style="border-collapse: collapse; width: 100%;">
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>User</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${userName} (${userEmail})</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>User ID</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${userId}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Application</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${appName}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Application ID</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${appId}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Requested at</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${new Date(timestamp).toLocaleString()}</td>
  </tr>
</table>
<p>Please review this request and grant access if appropriate.</p>
  `;

    return sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject,
        text,
        html
    });
}

module.exports = {
    initializeEmailService,
    sendEmail,
    sendAccessRequestNotification
};