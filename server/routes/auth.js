// server/routes/auth.js
const express = require('express');
const router = express.Router();
const oidcService = require('../services/oidcService');
const logger = require('../utils/logger');

// Login route - redirects to OIDC provider
router.get('/login', async (req, res) => {
    try {
        logger.info('Login route accessed', { userId: req.session.user?.id });
        const authUrl = await oidcService.generateAuthUrl(req);
        logger.debug('Redirecting to auth URL');
        res.redirect(authUrl);
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ error: 'Authentication failed', message: error.message });
    }
});

// OIDC callback handler
router.get('/callback', async (req, res) => {
    try {
        logger.info('Callback route accessed');
        if (!req.session.codeVerifier) {
            logger.error('No code verifier in session - session may have been lost');
            return res.status(400).send('Authentication failed: Session lost or expired. Please try again.');
        }
        try {
            const { tokenSet, userinfo } = await oidcService.handleCallback(req);

            const adminGroupName = process.env.ADMIN_GROUP_NAME;

            // Extract user information
            req.session.user = {
                id: userinfo.sub,
                name: userinfo.name || `${userinfo.given_name || ''} ${userinfo.family_name || ''}`.trim() || userinfo.sub,
                email: userinfo.email,
                groups: userinfo.groups || [],
                picture: userinfo.picture,
                isAdmin: adminGroupName ? (Array.isArray(userinfo.groups) && userinfo.groups.includes(adminGroupName)) : false
            };

            logger.info('User authenticated successfully', {
                userId: req.session.user.id,
                email: req.session.user.email,
                groupCount: req.session.user.groups.length,
                isAdmin: req.session.user.isAdmin
            });

            // Redirect to the dashboard
            logger.debug('Redirecting to dashboard');
            res.redirect('/dashboard');
        } catch (error) {
            logger.error('Token exchange error:', error);
            res.status(500).send(`Authentication failed: ${error.message}`);
        }
    } catch (error) {
        logger.error('Callback error:', error);
        res.status(500).send(`Authentication failed: ${error.message}`);
    }
});

// Logout route
router.get('/logout', async (req, res) => {
    try {
        logger.info('Logout route accessed', { userId: req.session.user?.id });
        const { logoutUrl, success } = await oidcService.logout(req);

        if (logoutUrl) {
            logger.debug('Redirecting to logout URL');
            res.redirect(logoutUrl);
        } else if (success) {
            logger.debug('Logout successful, redirecting to home');
            res.redirect('/');
        } else {
            throw new Error('Logout failed');
        }
    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed', message: error.message });
    }
});

// Get current user
router.get('/user', (req, res) => {
    const hasSession = !!req.session.user;
    logger.debug('User route accessed', {
        hasSession,
        userId: req.session.user?.id,
        isAdmin: req.session.user?.isAdmin
    });
    if (!hasSession) {
        logger.debug('No user session found, returning 401');
        return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json(req.session.user);
});

// Check auth status - for client-side auth checks
router.get('/status', (req, res) => {
    const hasSession = !!req.session.user;
    logger.debug('Status route accessed', {
        hasSession,
        isAdmin: req.session.user?.isAdmin
    });

    let oidcInitialized = false;
    try {
        oidcService.getConfig();
        oidcInitialized = true;
    } catch (error) {
        logger.debug('OIDC not initialized yet');
    }

    // Calculate token expiration time if available
    let tokenStatus = null;
    if (hasSession && req.session.tokenExpiry) {
        const now = new Date();
        const expiryTime = new Date(req.session.tokenExpiry);
        const diffMs = expiryTime - now;
        const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

        tokenStatus = {
            isExpired: diffMinutes <= 0,
            expiresInMinutes: diffMinutes,
            expiryTime: req.session.tokenExpiry
        };
    }

    // If session exists but is invalid (no user), destroy it
    if (req.session && !req.session.user) {
        logger.debug('Status check found session without user, cleaning up');
        req.session.regenerate((err) => {
            if (err) logger.error('Error regenerating session:', err);
            // Return status after cleanup
            res.json({
                authenticated: false,
                user: null,
                oidcInitialized,
                tokenStatus: null
            });
        });
        return;
    }

    res.json({
        authenticated: hasSession,
        user: req.session.user || null,
        oidcInitialized,
        tokenStatus
    });
});

// Add a login-url endpoint for the client to get the login URL without redirecting
router.get('/login-url', async (req, res) => {
    try {
        logger.info('Login URL requested');
        const authUrl = await oidcService.generateAuthUrl(req);
        logger.debug('Generated login URL successfully');
        res.json({ url: authUrl });
    } catch (error) {
        logger.error('Error generating login URL:', error);
        res.status(500).json({ error: 'Failed to generate login URL', message: error.message });
    }
});

module.exports = router;