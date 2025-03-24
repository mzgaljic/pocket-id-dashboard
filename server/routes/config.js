// server/routes/config.js
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

router.get('/', (req, res) => {
    logger.debug('Client requested configuration');

    // Important: only send metadata that is PUBLIC and SAFE to expose to the client
    res.json({
        pocketIdBaseUrl: process.env.POCKET_ID_BASE_URL || '',
        appTitle: process.env.APP_TITLE || 'Pocket ID Dashboard',
        ssoProviderName: process.env.APP_SSO_PROVIDER_NAME || 'Pocket ID',
    });
});

module.exports = router;