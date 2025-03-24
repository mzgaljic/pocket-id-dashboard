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
        logoLight: pocketIdBaseUrl ? `${pocketIdBaseUrl}/api/application-configuration/logo?light=true` : null,
        logoDark: pocketIdBaseUrl ? `${pocketIdBaseUrl}/api/application-configuration/logo?light=false` : null,
    });
});

module.exports = router;