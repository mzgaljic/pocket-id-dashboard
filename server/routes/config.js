// server/routes/config.js
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

router.get('/', (req, res) => {
    logger.debug('Client requested configuration');

    const pocketIdBaseUrl = process.env.POCKET_ID_BASE_URL;

    // Important: only send metadata that is PUBLIC and SAFE to expose to the client
    res.json({
        pocketIdBaseUrl: pocketIdBaseUrl || '',
        appTitle: process.env.APP_TITLE || 'Pocket ID Dashboard',
        ssoProviderName: process.env.APP_SSO_PROVIDER_NAME || 'Pocket ID',
        logoLight: pocketIdBaseUrl ? `${pocketIdBaseUrl}/api/application-images/logo?light=true` : null,
        logoDark: pocketIdBaseUrl ? `${pocketIdBaseUrl}/api/application-images/logo?light=false` : null,
        favicon: pocketIdBaseUrl ? `${pocketIdBaseUrl}/api/application-configuration/favicon` : null,
    });
});

router.get('/manifest.json', (req, res) => {
    const manifest = {
        name: process.env.APP_TITLE || 'Pocket ID Dashboard',
        short_name: process.env.APP_SHORT_NAME || process.env.APP_TITLE || 'App Dashboard',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
            {
                src: '/api/proxy/app-icon/192',
                sizes: '192x192',
                type: 'image/png'
            },
            {
                src: '/api/proxy/app-icon/512',
                sizes: '512x512',
                type: 'image/png'
            }
        ]
    };

    res.json(manifest);
});

module.exports = router;