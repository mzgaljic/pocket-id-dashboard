// server/utils/sessionEncryption.js
const crypto = require('crypto');
const logger = require('./logger');

// Encryption key derived from SESSION_SECRET
const getEncryptionKey = () => {
    // Use a hash of SESSION_SECRET as the encryption key
    return crypto
        .createHash('sha256')
        .update(process.env.SESSION_SECRET)
        .digest('hex')
        .substring(0, 32); // Use first 32 chars (256 bits)
};

// Encrypt session data
const encryptData = (data) => {
    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return {
            encrypted: true,
            iv: iv.toString('hex'),
            data: encrypted
        };
    } catch (error) {
        logger.error('Session encryption error:', error);
        // Fall back to unencrypted data if encryption fails
        return data;
    }
};

// Decrypt session data
const decryptData = (data) => {
    try {
        // Check if data is encrypted
        if (!data || !data.encrypted || !data.iv || !data.data) {
            return data;
        }

        const key = getEncryptionKey();
        const iv = Buffer.from(data.iv, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(data.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    } catch (error) {
        logger.error('Session decryption error:', error);
        // Return the original data if decryption fails
        return data;
    }
};

module.exports = { encryptData, decryptData };