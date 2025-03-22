// server/routes/apps.js
const express = require('express');
const router = express.Router();
const pocketIdService = require('../services/pocketIdService');
const path = require('path');
const { auth } = require('../middleware/auth');

// Get all apps the user has access to
router.get('/', async (req, res) => {
    try {
        // Get user ID from the session
        const userId = req.user.id;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        console.log('Fetching groups for user ID:', userId);

        // Get user groups from the API
        const userGroups = await pocketIdService.getUserGroups(userId);
        console.log(`Retrieved ${userGroups.length} groups for user`);

        // Extract group names
        const groupNames = userGroups.map(group => group.name);

        // Get accessible apps for the user
        const accessibleApps = await pocketIdService.getAccessibleOIDCClients(groupNames);
        console.log(`Found ${accessibleApps.length} accessible apps for user`);

        // Log the redirect URIs for debugging
        accessibleApps.forEach(app => {
            console.log(`App ${app.name} (${app.id}) redirect URI: ${app.redirectUri}`);
        });

        // Get all apps with access information for the "request access" feature
        const allApps = await pocketIdService.getAllOIDCClientsWithAccessInfo(groupNames);
        console.log(`Found ${allApps.length} total apps`);

        res.json({
            accessibleApps,
            allApps
        });
    } catch (error) {
        console.error('Error fetching apps:', error);
        res.status(500).json({ error: 'Failed to fetch applications', message: error.message });
    }
});

// Request access to an app
router.post('/request-access', async (req, res) => {
    try {
        const { appId } = req.body;
        const user = req.user;

        if (!appId) {
            return res.status(400).json({ error: 'Application ID is required' });
        }

        // In a real implementation, you would send an email to admin or create a request in a database
        console.log(`User ${user.email} requested access to app ${appId}`);

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
        console.error('Error requesting access:', error);
        res.status(500).json({ error: 'Failed to submit access request', message: error.message });
    }
});

// Get a specific app's logo
router.get('/:id/logo', async (req, res) => {
    try {
        const { id } = req.params;

        // Get the logo for the specified client
        const logoData = await pocketIdService.getOIDCClientLogo(id);

        // Set appropriate content type
        res.set('Content-Type', 'image/png'); // Adjust if needed based on actual logo format
        res.send(logoData);
    } catch (error) {
        console.error(`Error fetching logo for app ${req.params.id}:`, error);
        res.status(404).sendFile(path.join(__dirname, '../assets/default-logo.png')); // Provide a default logo
    }
});

// Clear the cache
router.post('/clear-cache', auth, async (req, res) => {
    try {
        // Check if user is an admin
        if (!req.user.isAdmin) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        pocketIdService.clearCache();
        res.json({ success: true, message: 'Cache cleared successfully' });
    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({ error: 'Failed to clear cache', message: error.message });
    }
});

module.exports = router;