// server/services/oidcService.js
const { discovery, randomState, randomPKCECodeVerifier, calculatePKCECodeChallenge, buildAuthorizationUrl, authorizationCodeGrant } = require('openid-client');
const logger = require('../utils/logger');

let config;

async function initializeOIDCClient() {
    try {
        // Check if required environment variables are set
        if (!process.env.OIDC_DISCOVERY_URL) {
            throw new Error('OIDC_DISCOVERY_URL environment variable is not set');
        }
        if (!process.env.OIDC_CLIENT_ID) {
            throw new Error('OIDC_CLIENT_ID environment variable is not set');
        }

        logger.info('Discovering OIDC provider', {
            discoveryUrl: process.env.OIDC_DISCOVERY_URL,
            clientId: process.env.OIDC_CLIENT_ID
        });

        // Use the discovery function to initialize the client configuration
        config = await discovery(
            new URL(process.env.OIDC_DISCOVERY_URL),
            process.env.OIDC_CLIENT_ID,
            process.env.OIDC_CLIENT_SECRET
        );

        logger.info('OIDC client initialized successfully');
        logger.debug('OIDC endpoints', {
            authorizationEndpoint: config.serverMetadata().authorization_endpoint,
            tokenEndpoint: config.serverMetadata().token_endpoint,
            userinfoEndpoint: config.serverMetadata().userinfo_endpoint,
            endSessionEndpoint: config.serverMetadata().end_session_endpoint
        });

        return config;
    } catch (error) {
        logger.error('Error initializing OIDC client:', error);
        throw error;
    }
}

function getConfig() {
    if (!config) {
        throw new Error('OIDC client not initialized');
    }
    return config;
}

async function generateAuthUrl(req) {
    if (!config) {
        logger.error('Attempted to generate auth URL before OIDC client initialization');
        throw new Error('OIDC client not initialized');
    }

    logger.info(`Generating auth URL with redirect URI: ${process.env.OIDC_REDIRECT_URI}`);

    // Generate PKCE code verifier and challenge
    const codeVerifier = randomPKCECodeVerifier();
    const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);

    // Generate state for CSRF protection
    const state = randomState();

    logger.debug('Generated PKCE and state values');

    // Store PKCE and state values in session for verification during callback
    req.session.codeVerifier = codeVerifier;
    req.session.state = state;

    // Force session save to ensure values are persisted
    req.session.save((err) => {
        if (err) {
            logger.error('Error saving session:', err);
        } else {
            logger.debug('Session saved successfully with code verifier and state');
        }
    });

    // Build the authorization URL using the proper API
    const parameters = {
        redirect_uri: process.env.OIDC_REDIRECT_URI,
        scope: 'openid profile email groups',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: state
    };

    const authorizationUrl = buildAuthorizationUrl(config, parameters);
    logger.debug('Generated auth URL');

    return authorizationUrl.href;
}

async function handleCallback(req) {
    if (!config) {
        logger.error('Attempted to handle callback before OIDC client initialization');
        throw new Error('OIDC client not initialized');
    }

    logger.info('Handling OIDC callback');
    logger.debug('Callback query parameters received', {
        code: req.query.code ? '[PRESENT]' : '[MISSING]',
        state: req.query.state
    });

    if (!req.session.codeVerifier) {
        logger.error('No code verifier in session - session may have been lost');
        throw new Error('No code verifier in session - session may have been lost');
    }

    try {
        // Use the authorizationCodeGrant function from openid-client
        const currentUrl = new URL(req.originalUrl, `http://${req.headers.host}`);
        logger.debug('Exchanging authorization code for tokens');

        const tokenSet = await authorizationCodeGrant(
            config,
            currentUrl,
            {
                pkceCodeVerifier: req.session.codeVerifier,
                expectedState: req.session.state
            }
        );

        logger.info('Token exchange successful');
        logger.debug('Received token types', {
            accessToken: tokenSet.access_token ? '[PRESENT]' : '[MISSING]',
            idToken: tokenSet.id_token ? '[PRESENT]' : '[MISSING]',
            refreshToken: tokenSet.refresh_token ? '[PRESENT]' : '[MISSING]',
            expiresIn: tokenSet.expires_in
        });

        // Clean up the session
        delete req.session.codeVerifier;
        delete req.session.state;

        // Extract user info from ID token
        let userinfo = {};
        if (tokenSet.id_token) {
            // Parse the ID token to get user info (already decoded by the library)
            userinfo = tokenSet.claims();
            logger.debug('Extracted claims from ID token', {
                sub: userinfo.sub,
                email: userinfo.email ? '[PRESENT]' : '[MISSING]',
                name: userinfo.name ? '[PRESENT]' : '[MISSING]',
                groups: Array.isArray(userinfo.groups) ? `[${userinfo.groups.length} groups]` : '[MISSING]'
            });
        }

        // Store token information and expiry
        req.session.tokenSet = {
            access_token: tokenSet.access_token,
            id_token: tokenSet.id_token,
            refresh_token: tokenSet.refresh_token,
        };

        // Store token expiry time
        if (tokenSet.expires_in) {
            const expiresAt = new Date();
            expiresAt.setSeconds(expiresAt.getSeconds() + tokenSet.expires_in);
            req.session.tokenExpiry = expiresAt;
            logger.debug('Token expiry set', { expiresAt: expiresAt.toISOString() });
        }

        return { tokenSet, userinfo };
    } catch (error) {
        logger.error('Token exchange error:', error);
        throw error;
    }
}

async function logout(req) {
    if (!req.session.tokenSet) {
        logger.info('No token set in session, nothing to logout');
        return { success: true };
    }

    if (!config) {
        logger.warn('OIDC client not initialized, destroying session only');
        req.session.destroy((err) => {
            if (err) logger.error('Error destroying session:', err);
            else logger.debug('Session destroyed successfully');
        });
        return { success: true };
    }

    const idToken = req.session.tokenSet.id_token;

    // Get the end session endpoint from the server metadata
    const metadata = config.serverMetadata();
    const endSessionEndpoint = metadata.end_session_endpoint;
    logger.debug('End session endpoint:', endSessionEndpoint);

    // Clear the session
    req.session.destroy((err) => {
        if (err) logger.error('Error destroying session:', err);
        else logger.debug('Session destroyed successfully');
    });

    // Build the end session URL if available
    if (endSessionEndpoint) {
        const logoutUrl = new URL(endSessionEndpoint);
        if (idToken) {
            logoutUrl.searchParams.set('id_token_hint', idToken);
        }
        if (process.env.OIDC_POST_LOGOUT_REDIRECT_URI) {
            logoutUrl.searchParams.set('post_logout_redirect_uri', process.env.OIDC_POST_LOGOUT_REDIRECT_URI);
        }
        logger.info('Constructed logout URL');
        return { logoutUrl: logoutUrl.href };
    }

    return { success: true };
}

/**
 * Refresh an access token using a refresh token
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<Object>} - New token set
 */
async function refreshToken(refreshToken) {
    if (!config) {
        logger.error('Attempted to refresh token before OIDC client initialization');
        throw new Error('OIDC client not initialized');
    }

    try {
        logger.info('Refreshing access token');

        // Use the refresh token to get a new access token
        const tokenSet = await config.refreshToken(refreshToken);

        logger.info('Token refresh successful');
        logger.debug('Received token types', {
            accessToken: tokenSet.access_token ? '[PRESENT]' : '[MISSING]',
            idToken: tokenSet.id_token ? '[PRESENT]' : '[MISSING]',
            refreshToken: tokenSet.refresh_token ? '[PRESENT]' : '[MISSING]',
            expiresIn: tokenSet.expires_in
        });

        return { tokenSet };
    } catch (error) {
        logger.error('Token refresh error:', error);
        throw error;
    }
}

module.exports = {
    initializeOIDCClient,
    getConfig,
    generateAuthUrl,
    handleCallback,
    logout,
    refreshToken
};