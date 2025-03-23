// server/middleware/sessionEncryption.js

const { encryptData, decryptData } = require('../utils/sessionEncryption');
const logger = require('../utils/logger');

/**
 * Middleware to encrypt sensitive session data
 */
function sessionEncryption(req, res, next) {
    // Skip if session doesn't exist
    if (!req.session) {
        return next();
    }

    // Store the original session save method
    const originalSave = req.session.save;

    // Override the save method to encrypt sensitive data
    req.session.save = function(callback) {
        try {
            // Only encrypt if we have user data and token data
            if (this.user && this.tokenSet) {
                // Create a copy of the session
                const sessionCopy = { ...this };

                // Encrypt sensitive data
                sessionCopy.tokenSet = encryptData(this.tokenSet);

                // Replace the session data with the encrypted version
                Object.assign(this, sessionCopy);
            }
        } catch (error) {
            logger.error('Error encrypting session data:', error);
            // Continue with unencrypted data if encryption fails
        }

        // Call the original save method
        return originalSave.call(this, callback);
    };

    // Decrypt any encrypted data in the session
    try {
        if (req.session.tokenSet && req.session.tokenSet.encrypted) {
            req.session.tokenSet = decryptData(req.session.tokenSet);
        }
    } catch (error) {
        logger.error('Error decrypting session data:', error);
        // Continue with the session as is if decryption fails
    }

    next();
}

module.exports = { sessionEncryption };