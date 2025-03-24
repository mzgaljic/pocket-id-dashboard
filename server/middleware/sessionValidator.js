// server/middleware/sessionValidator.js
const logger = require('../utils/logger');

/**
 * Middleware to validate session integrity
 */
function sessionValidator(req, res, next) {
    // Skip for non-authenticated routes and static files
    if (req.path.startsWith('/auth/login') ||
        req.path.startsWith('/auth/callback') ||
        req.path === '/auth/status' ||
        req.path === '/api/config' ||
        req.path === '/' ||
        req.path.includes('.')) {
        return next();
    }

    // Check if session exists but user data is missing or incomplete
    if (req.session && (!req.session.user || !req.session.user.id)) {
        logger.warn('Invalid session detected', {
            path: req.path,
            hasSession: !!req.session,
            hasUser: !!req.session?.user
        });

        // Clear the invalid session
        req.session.destroy((err) => {
            if (err) logger.error('Error destroying invalid session:', err);

            // For API requests, return JSON error
            if (req.path.startsWith('/api/')) {
                return res.status(401).json({
                    error: 'Invalid session',
                    code: 'invalid_session'
                });
            }

            // For non-API requests, redirect to home page
            return res.redirect('/');
        });
        return;
    }

    next();
}

module.exports = { sessionValidator };