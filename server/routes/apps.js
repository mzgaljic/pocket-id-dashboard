// server/routes/apps.js
const express = require('express');
const router = express.Router();
const { apps } = require('../mock/apps');

// Get all apps
router.get('/', (req, res) => {
    // In a real implementation, filter apps based on user groups
    const userGroups = req.user.groups || [];

    // Filter apps that the user has access to
    const accessibleApps = apps.filter(app =>
        app.groups.some(group => userGroups.includes(group))
    );

    // All apps for the "request access" feature
    const allApps = apps.map(app => ({
        id: app.id,
        name: app.name,
        description: app.description,
        logo: app.logo,
        hasAccess: app.groups.some(group => userGroups.includes(group))
    }));

    res.json({
        accessibleApps,
        allApps
    });
});

// Request access to an app
router.post('/request-access', (req, res) => {
    const { appId } = req.body;
    const user = req.user;

    // In a real implementation, send email to admin
    console.log(`User ${user.email} requested access to app ${appId}`);

    res.json({ success: true, message: 'Access request submitted' });
});

module.exports = router;