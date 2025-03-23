// server/services/sessionCleanup.js

const { db } = require('../database');
const logger = require('../utils/logger');

/**
 * Clean up expired sessions
 * @returns {Promise<number>} - Number of sessions removed
 */
async function cleanupExpiredSessions() {
    try {
        const now = new Date().toISOString();
        const result = await db('sessions')
            .where('expired', '<', now)
            .delete();

        logger.info(`Cleaned up ${result} expired sessions`);
        return result;
    } catch (error) {
        logger.error('Error cleaning up expired sessions:', error);
        throw error;
    }
}

/**
 * Start periodic session cleanup
 * @param {number} intervalMinutes - Cleanup interval in minutes
 */
function startSessionCleanup(intervalMinutes = 60) {
    logger.info(`Starting session cleanup every ${intervalMinutes} minutes`);

    // Run initial cleanup
    cleanupExpiredSessions()
        .catch(error => logger.error('Initial session cleanup failed:', error));

    // Set up interval for periodic cleanup
    const interval = setInterval(() => {
        cleanupExpiredSessions()
            .catch(error => logger.error('Periodic session cleanup failed:', error));
    }, intervalMinutes * 60 * 1000);

    // Make the interval immune to unhandled promise rejections
    interval.unref();

    return interval;
}

module.exports = {
    cleanupExpiredSessions,
    startSessionCleanup
};