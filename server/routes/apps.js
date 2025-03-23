// server/routes/apps.js
const express = require('express');
const router = express.Router();
const pocketIdService = require('../services/pocketIdService');
const path = require('path');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

// Get all apps the user has access to
router.get('/', async (req, res) => {
    try {
        // Get user ID from the session
        const userId = req.user.id;
        if (!userId) {
            logger.warn('User ID is required but not found in session');
            return res.status(400).json({ error: 'User ID is required' });
        }

        logger.info('Fetching groups for user', { userId });

        // Get user groups from the API
        const userGroups = await pocketIdService.getUserGroups(userId);
        logger.debug(`Retrieved ${userGroups.length} groups for user`, { userId });

        // Extract group names
        const groupNames = userGroups.map(group => group.name);

        // Get accessible apps for the user
        logger.info('Fetching accessible apps for user', { userId, groupCount: groupNames.length });
        const accessibleApps = await pocketIdService.getAccessibleOIDCClients(groupNames);
        logger.debug(`Found ${accessibleApps.length} accessible apps for user`, { userId });

        // Log the redirect URIs for debugging
        logger.verbose('App redirect URIs', {
            apps: accessibleApps.map(app => ({
                id: app.id,
                name: app.name,
                redirectUri: app.redirectUri
            }))
        });

        // Get all apps with access information for the "request access" feature
        logger.info('Fetching all apps with access info', { userId });
        const allApps = await pocketIdService.getAllOIDCClientsWithAccessInfo(groupNames);
        logger.debug(`Found ${allApps.length} total apps`, { userId });

        res.json({
            accessibleApps,
            allApps
        });
    } catch (error) {
        logger.error('Error fetching apps:', error);
        res.status(500).json({ error: 'Failed to fetch applications', message: error.message });
    }
});

// Request access to an app
router.post('/request-access', async (req, res) => {
    try {
        const { appId } = req.body;
        const user = req.user;

        if (!appId) {
            logger.warn('Application ID is required but not provided', { userId: user.id });
            return res.status(400).json({ error: 'Application ID is required' });
        }

        // In a real implementation, you would send an email to admin or create a request in a database
        logger.info('User requested access to app', {
            userId: user.id,
            userEmail: user.email,
            appId
        });

        // For now, just return success
        res.json({
            success: true,
            message: 'Access request submitted',
            requestDetails: {
                appId,
                userId: user.id,
                userEmail: user.email,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Error requesting access:', error);
        res.status(500).json({ error: 'Failed to submit access request', message: error.message });
    }
});

// Get a specific app's logo
router.get('/:id/logo', async (req, res) => {
    try {
        const { id } = req.params;
        logger.debug('Fetching logo for app', { appId: id });

        // Get the logo for the specified client
        const logoData = await pocketIdService.getOIDCClientLogo(id);

        // Set appropriate content type
        res.set('Content-Type', 'image/png'); // Adjust if needed based on actual logo format
        res.send(logoData);
    } catch (error) {
        logger.error(`Error fetching logo for app ${req.params.id}:`, error);
        res.status(404).sendFile(path.join(__dirname, '../assets/default-logo.png')); // Provide a default logo
    }
});

// Clear the cache
router.post('/clear-cache', auth, async (req, res) => {
    try {
        // Check if user is an admin
        if (!req.user.isAdmin) {
            logger.warn('Non-admin user attempted to clear cache', { userId: req.user.id });
            return res.status(403).json({ error: 'Unauthorized' });
        }

        logger.info('Clearing cache', { userId: req.user.id });
        pocketIdService.clearCache();
        res.json({ success: true, message: 'Cache cleared successfully' });
    } catch (error) {
        logger.error('Error clearing cache:', error);
        res.status(500).json({ error: 'Failed to clear cache', message: error.message });
    }
});

module.exports = router;