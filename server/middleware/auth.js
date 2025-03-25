// server/middleware/auth.js
const logger = require('../utils/logger');

const auth = (req, res, next) => {
    // Check if it's an API request
    const isApiRequest = req.path.startsWith('/api/');

    if (!req.session.user) {
        logger.warn('Unauthorized access attempt', {
            path: req.path,
            method: req.method,
            ip: req.ip,
            isApiRequest
        });

        // For API requests, return 401 JSON response
        if (isApiRequest) {
            return res.status(401).json({
                error: 'Unauthorized',
                code: 'not_authenticated'
            });
        }

        // For non-API requests, redirect to the home page
        return res.redirect('/');
    }

    // Check if token is expired
    if (req.session.tokenExpiry && new Date() > new Date(req.session.tokenExpiry)) {
        // Token expired, clear the session
        logger.info('Session expired', { userId: req.session.user.id });

        req.session.destroy((err) => {
            if (err) logger.error('Error destroying session:', err);

            // For API requests, return 401 JSON response
            if (isApiRequest) {
                return res.status(401).json({
                    error: 'Session expired',
                    code: 'token_expired'
                });
            }

            // For non-API requests, redirect to the home page
            return res.redirect('/');
        });
        return;
    }

    // Check if token is about to expire (within 5 minutes)
    const tokenExpiryTime = req.session.tokenExpiry ? new Date(req.session.tokenExpiry) : null;
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (tokenExpiryTime && tokenExpiryTime < fiveMinutesFromNow) {
        // Token is about to expire
        logger.info('Token about to expire', { userId: req.session.user.id });

        // Check if we have a refresh token
        if (req.session.tokenSet && req.session.tokenSet.refresh_token) {
            // Try to refresh it
            logger.info('Attempting token refresh', { userId: req.session.user.id });

            // Continue with the request, but trigger a token refresh in the background
            refreshTokenInBackground(req)
                .catch(error => {
                    logger.error('Background token refresh failed:', error);
                });
        } else {
            // No refresh token available - this is expected with public clients
            logger.info('No refresh token available - this is normal for public clients');

            // For API requests, we could add a header to indicate token expiry is approaching
            if (isApiRequest) {
                res.set('X-Token-Expiring-Soon', 'true');
            }
        }
    }

    req.user = req.session.user;
    next();
};


/**
 * Refresh the token in the background
 * @param {Object} req - Express request object
 * @returns {Promise<void>}
 */
async function refreshTokenInBackground(req) {
    try {
        // Only attempt refresh if we have the necessary data
        if (!req.session.tokenSet || !req.session.tokenSet.refresh_token) {
            logger.debug('No refresh token available - skipping refresh');
            return;
        }

        // Call the OIDC service to refresh the token
        const result = await oidcService.refreshToken(req.session.tokenSet.refresh_token);

        // Check if refresh was successful
        if (result.tokenSet) {
            // Update the session with the new token information
            req.session.tokenSet = {
                access_token: result.tokenSet.access_token,
                id_token: result.tokenSet.id_token,
                refresh_token: result.tokenSet.refresh_token || req.session.tokenSet.refresh_token
            };

            // Update token expiry time
            if (result.tokenSet.expires_in) {
                const expiresAt = new Date();
                expiresAt.setSeconds(expiresAt.getSeconds() + result.tokenSet.expires_in);
                req.session.tokenExpiry = expiresAt;
                logger.debug('Token refreshed, new expiry set', { expiresAt: expiresAt.toISOString() });
            }

            // Save the session
            await new Promise((resolve, reject) => {
                req.session.save(err => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            logger.info('Token refreshed successfully', { userId: req.session.user.id });
        } else if (result.error) {
            // Handle the case where refresh failed but we have a structured error
            logger.warn(`Token refresh failed: ${result.error}`, {
                message: result.message,
                userId: req.session.user.id
            });
        }
    } catch (error) {
        logger.error('Failed to refresh token:', error);
        throw error;
    }
}

module.exports = { auth };