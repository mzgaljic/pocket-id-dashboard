// server/middleware/auth.js
const logger = require('../utils/logger');

const auth = (req, res, next) => {
    if (!req.session.user) {
        logger.warn('Unauthorized access attempt', {
            path: req.path,
            method: req.method,
            ip: req.ip
        });
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if token is expired
    if (req.session.tokenExpiry && new Date() > new Date(req.session.tokenExpiry)) {
        // Token expired, clear the session
        logger.info('Session expired', { userId: req.session.user.id });
        req.session.destroy((err) => {
            if (err) logger.error('Error destroying session:', err);
            return res.status(401).json({ error: 'Session expired' });
        });
        return;
    }

    req.user = req.session.user;
    // Only log auth at debug level for API endpoints that aren't frequently called
    if (req.path !== '/api/apps' && req.path.startsWith('/api/')) {
        logger.debug('User authenticated for request', {
            userId: req.user.id,
            path: req.path
        });
    }
    next();
};

module.exports = { auth };