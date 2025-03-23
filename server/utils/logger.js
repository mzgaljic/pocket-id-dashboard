// server/utils/logger.js
const winston = require('winston');

// Get log level from environment variable, default to 'info'
const logLevel = process.env.LOG_LEVEL || 'info';

// Create a custom format that doesn't log sensitive data
const sanitizeSecrets = winston.format((info) => {
    // Create a deep copy of the log info object
    const sanitized = { ...info };

    // List of keys that might contain sensitive information
    const sensitiveKeys = [
        'password', 'secret', 'token', 'key', 'auth', 'authorization', 'cookie',
        'session', 'accessToken', 'refreshToken', 'idToken', 'codeVerifier'
    ];

    // Function to recursively sanitize an object
    const sanitizeObject = (obj) => {
        if (!obj || typeof obj !== 'object') return;

        Object.keys(obj).forEach(key => {
            // Check if the key name contains any sensitive keywords
            if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
                if (obj[key]) {
                    obj[key] = '[REDACTED]';
                }
            } else if (typeof obj[key] === 'object') {
                // Recursively sanitize nested objects
                sanitizeObject(obj[key]);
            }
        });
    };

    // Sanitize the message if it's an object
    if (typeof sanitized.message === 'object') {
        sanitized.message = { ...sanitized.message };
        sanitizeObject(sanitized.message);
    }

    // Sanitize any additional metadata
    Object.keys(sanitized).forEach(key => {
        if (key !== 'level' && key !== 'message' && typeof sanitized[key] === 'object') {
            sanitized[key] = { ...sanitized[key] };
            sanitizeObject(sanitized[key]);
        }
    });

    return sanitized;
});

// Create a custom format for console output that properly displays metadata
const consoleFormat = winston.format.printf(info => {
    // Format the main message
    let logMessage = `${info.timestamp} ${info.level}: ${info.message}`;

    // Add metadata if present (excluding standard fields)
    const metadata = { ...info };
    delete metadata.timestamp;
    delete metadata.level;
    delete metadata.message;
    delete metadata.service;

    // If we have metadata, add it to the log message
    if (Object.keys(metadata).length > 0) {
        // Convert metadata to a formatted string
        const metadataStr = JSON.stringify(metadata, null, 2);
        logMessage += ` ${metadataStr}`;
    }

    // Add stack trace if present
    if (info.stack) {
        logMessage += `\n${info.stack}`;
    }

    return logMessage;
});

// Create the logger
const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
        sanitizeSecrets(),
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat()
    ),
    defaultMeta: { service: 'pocket-id-dashboard' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                consoleFormat
            )
        })
    ]
});

// Add a stream for Express middleware
logger.stream = {
    write: (message) => {
        logger.info(message.trim());
    }
};

// Log available levels on startup
logger.info(`Logger initialized with level: ${logLevel}`);
logger.info('Available log levels: error, warn, info, http, verbose, debug, silly');

module.exports = logger;