// server/routes/apps.js
const express = require('express');
const router = express.Router();
const path = require('path');
const { LRUCache } = require('lru-cache');
const emailService = require('../services/emailService');
const pocketIdService = require('../services/pocketIdService');
const accessRequestRepository = require('../repositories/accessRequestRepository');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const logoCache = new LRUCache({
    max: 100, // count
    maxSize: 10 * 1024 * 1024, // 10MB
    ttl: 60 * 60 * 1000, // 60 minutes

    // calculate approx size in bytes
    sizeCalculation: (value, key) => {
        const imageSize = value.data.length;
        const metadataSize = (value.contentType.length + key.length);
        return imageSize + metadataSize;
    }
});

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

        logger.debug(`Found ${accessibleApps.length} accessible apps for user (excluding current app)`, { userId });

        // Get all apps with access information, excluding the current app
        logger.info('Fetching all apps with access info', { userId });
        const allApps = await pocketIdService.getAllOIDCClientsWithAccessInfo(groupNames);

        logger.debug(`Found ${allApps.length} total apps (excluding current app)`, { userId });

        res.json({
            accessibleApps,
            allApps
        });
    } catch (error) {
        logger.error('Error fetching apps:', error);
        res.status(500).json({ error: 'Failed to fetch applications', message: error.message });
    }
});


router.post('/request-access', async (req, res) => {
    try {
        const { appId } = req.body;
        const user = req.user;

        if (!appId) {
            logger.warn('Application ID is required but not provided', { userId: user.id });
            return res.status(400).json({ error: 'Application ID is required' });
        }

        // Get app details to include in the notification
        let appName = 'Unknown Application';
        try {
            const appDetails = await pocketIdService.getOIDCClient(appId);
            appName = appDetails.name || appName;
        } catch (error) {
            logger.warn(`Could not fetch app details for ${appId}`, { error: error.message });
        }

        // Log the request
        logger.info('User requested access to app', {
            userId: user.id,
            userEmail: user.email,
            appId,
            appName
        });

        // Save the request to the database
        const requestData = {
            userId: user.id,
            appId,
            appName,
            notes: `Access requested by ${user.name} (${user.email})`
        };

        const savedRequest = await accessRequestRepository.createRequest(requestData);

        // Create request details for email
        const requestDetails = {
            appId,
            appName,
            userId: user.id,
            userEmail: user.email,
            userName: user.name,
            timestamp: new Date().toISOString()
        };

        // Send email notification asynchronously
        emailService.sendAccessRequestNotification(requestDetails)
            .then(success => {
                if (success) {
                    logger.info('Access request notification sent successfully', { appId, userId: user.id });
                } else {
                    logger.warn('Failed to send access request notification', { appId, userId: user.id });
                }
            })
            .catch(error => {
                logger.error('Error sending access request notification', {
                    error: error.message,
                    appId,
                    userId: user.id
                });
            });

        // Return success response with the saved request
        res.json({
            success: true,
            message: 'Access request submitted',
            request: savedRequest
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

        // Check cache first
        const cached = logoCache.get(id);
        if (cached) {
            logger.debug('Serving cached logo for app', {
                appId: id,
                size: cached.data.length,
                contentType: cached.contentType
            });
            res.set('Content-Type', cached.contentType);
            res.set('Cache-Control', 'public, max-age=3600'); // 60 minutes
            return res.send(cached.data);
        }

        // If not in cache, fetch from service
        const { data: logoData, contentType } = await pocketIdService.getOIDCClientLogo(id);

        // Store in cache
        logoCache.set(id, {
            contentType: contentType || 'image/png'
        });

        // Log cache statistics
        logger.debug('Cache statistics', {
            size: logoCache.size,
            itemCount: logoCache.size,
            maxSize: logoCache.maxSize,
            remaining: logoCache.maxSize - logoCache.size
        });

        // Set content type from response
        res.set('Content-Type', contentType || 'image/png');
        res.set('Cache-Control', 'public, max-age=3600'); // 60 minutes
        res.send(logoData);
    } catch (error) {
        logger.error(`Error fetching logo for app ${req.params.id}:`, error);
        res.set('Content-Type', 'image/png');
        res.status(404).sendFile(path.join(__dirname, '../assets/default-logo.png'));
    }
});


// Clear the cache
router.post('/clear-cache', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const adminGroupName = process.env.ADMIN_GROUP_NAME;
        if (!adminGroupName) {
            logger.warn('Attempt to clear the cache, but no admin group has been defined.');
            return res.status(403).json({
                error: 'Unauthorized',
                message: 'You do not have permission to clear the cache'
            });
        }

        logger.info('Cache clear requested - verifying admin status', { userId });

        const userGroups = await pocketIdService.getUserGroups(userId);
        const groupNames = userGroups.map(group => group.name);
        const isCurrentlyAdmin = groupNames.includes(adminGroupName);

        if (!isCurrentlyAdmin) {
            logger.warn('Non-admin user attempted to clear cache', {
                userId,
                groups: groupNames,
                adminGroup: adminGroupName
            });
            return res.status(403).json({
                error: 'Unauthorized',
                message: 'You do not have permission to clear the cache'
            });
        }

        logger.info('Admin verification successful, clearing cache', { userId });
        pocketIdService.clearCache();
        logoCache.clear();

        // Update session
        req.session.user.groups = groupNames;
        req.session.user.isAdmin = isCurrentlyAdmin;

        res.json({
            success: true,
            message: 'Cache cleared successfully'
        });
    } catch (error) {
        logger.error('Error clearing cache:', error);
        res.status(500).json({
            error: 'Failed to clear cache',
            message: error.message
        });
    }
});


// Get user's access requests
router.get('/requests', async (req, res) => {
    try {
        const userId = req.user.id;
        logger.info('Fetching access requests for user', { userId });

        const requests = await accessRequestRepository.getRequestsByUser(userId);

        res.json(requests);
    } catch (error) {
        logger.error('Error fetching access requests:', error);
        res.status(500).json({ error: 'Failed to fetch access requests', message: error.message });
    }
});


module.exports = router;