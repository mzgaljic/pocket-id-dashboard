// server/utils/validateEnv.js
const logger = require('./logger');

/**
 * Validates required environment variables
 * @returns {boolean} - True if all required variables are set, false otherwise
 */
function validateEnvironment() {
    // Check SESSION_SECRET separately with strict requirements
    if (!process.env.SESSION_SECRET) {
        logger.error('SESSION_SECRET environment variable is not set');
        logger.error('Please set a strong, unique SESSION_SECRET for security');
        return false;
    }

    // Check if SESSION_SECRET is too short or obviously insecure
    if (process.env.SESSION_SECRET.length < 32 ||
        process.env.SESSION_SECRET === 'your-secret-key' ||
        process.env.SESSION_SECRET.includes('CHANGE_ME') ||
        process.env.SESSION_SECRET.includes('some long secret here')) {
        logger.error('SESSION_SECRET is too weak or using a placeholder value');
        logger.error('Please set a strong, unique SESSION_SECRET (at least 32 characters) for security');
        return false;
    }

    const requiredVars = [
        { name: 'OIDC_CLIENT_ID' },
        { name: 'OIDC_DISCOVERY_URL' },
        { name: 'POCKET_ID_BASE_URL' },
        { name: 'POCKET_ID_API_KEY' }
    ];

    let valid = true;
    const missingVars = [];

    for (const variable of requiredVars) {
        const value = process.env[variable.name];

        // Check if variable is missing
        if (!value) {
            valid = false;
            missingVars.push(variable.name);
        }
    }

    if (!valid) {
        logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
        logger.error('Please set these variables in your .env file or environment');
    }

    return valid;
}

module.exports = { validateEnvironment };