// server/services/oidcService.js
const { discovery, randomState, randomPKCECodeVerifier, calculatePKCECodeChallenge, buildAuthorizationUrl, authorizationCodeGrant } = require('openid-client');
const crypto = require('crypto');

let config;

// server/services/oidcService.js - Corrected initializeOIDCClient function
async function initializeOIDCClient() {
    try {
        // Check if required environment variables are set
        if (!process.env.OIDC_DISCOVERY_URL) {
            throw new Error('OIDC_DISCOVERY_URL environment variable is not set');
        }

        if (!process.env.OIDC_CLIENT_ID) {
            throw new Error('OIDC_CLIENT_ID environment variable is not set');
        }

        console.log('Discovering OIDC provider at:', process.env.OIDC_DISCOVERY_URL);
        console.log('Using client ID:', process.env.OIDC_CLIENT_ID);

        // Use the discovery function to initialize the client configuration
        config = await discovery(
            new URL(process.env.OIDC_DISCOVERY_URL),
            process.env.OIDC_CLIENT_ID,
            process.env.OIDC_CLIENT_SECRET
        );

        console.log('OIDC client initialized successfully');
        console.log('Authorization endpoint:', config.serverMetadata().authorization_endpoint);
        console.log('Token endpoint:', config.serverMetadata().token_endpoint);
        return config;
    } catch (error) {
        console.error('Error initializing OIDC client:', error);
        throw error;
    }
}

function getConfig() {
    if (!config) {
        throw new Error('OIDC client not initialized');
    }
    return config;
}

// server/services/oidcService.js - Fix the generateAuthUrl function
async function generateAuthUrl(req) {
    if (!config) {
        throw new Error('OIDC client not initialized');
    }

    console.log('Generating auth URL with redirect URI:', process.env.OIDC_REDIRECT_URI);

    // Generate PKCE code verifier and challenge
    const codeVerifier = randomPKCECodeVerifier();
    const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);

    // Generate state for CSRF protection
    const state = randomState();

    console.log('Generated PKCE code verifier and state');
    console.log('Code verifier:', codeVerifier);
    console.log('State:', state);

    // Store PKCE and state values in session for verification during callback
    req.session.codeVerifier = codeVerifier;
    req.session.state = state;

    // Force session save to ensure values are persisted
    req.session.save((err) => {
        if (err) {
            console.error('Error saving session:', err);
        } else {
            console.log('Session saved successfully with code verifier and state');
        }
    });

    // Build the authorization URL using the proper API
    const authorizationUrl = new URL(config.serverMetadata().authorization_endpoint);

    // Add the required parameters
    authorizationUrl.searchParams.set('client_id', process.env.OIDC_CLIENT_ID);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('redirect_uri', process.env.OIDC_REDIRECT_URI);
    authorizationUrl.searchParams.set('scope', 'openid profile email groups');
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');

    console.log('Generated auth URL:', authorizationUrl.href);
    return authorizationUrl.href;
}

// server/services/oidcService.js - Corrected handleCallback function
async function handleCallback(req) {
    if (!config) {
        throw new Error('OIDC client not initialized');
    }

    console.log('Handling callback with query params:', req.query);
    console.log('Session state:', req.session.state);
    console.log('Session code verifier exists:', !!req.session.codeVerifier);

    // Verify the state parameter
    if (req.query.state !== req.session.state) {
        throw new Error('State parameter mismatch');
    }

    // Get the token endpoint from the configuration
    const tokenEndpoint = config.serverMetadata().token_endpoint;
    console.log('Token endpoint:', tokenEndpoint);

    // Prepare the token request parameters
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', req.query.code);
    params.append('redirect_uri', process.env.OIDC_REDIRECT_URI);
    params.append('client_id', process.env.OIDC_CLIENT_ID);

    if (process.env.OIDC_CLIENT_SECRET) {
        params.append('client_secret', process.env.OIDC_CLIENT_SECRET);
    }

    params.append('code_verifier', req.session.codeVerifier);

    console.log('Token request params:', Object.fromEntries(params));

    try {
        // Make the token request
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Token exchange failed:', errorData);
            throw new Error(`Token exchange failed: ${errorData.error}`);
        }

        const tokenSet = await response.json();
        console.log('Token exchange successful:', Object.keys(tokenSet));

        // Clean up the session
        delete req.session.codeVerifier;
        delete req.session.state;

        // Get user info from the ID token
        let userinfo = {};

        if (tokenSet.id_token) {
            console.log('Parsing ID token');
            // Parse the ID token to get user info
            const payload = JSON.parse(
                Buffer.from(tokenSet.id_token.split('.')[1], 'base64').toString()
            );

            userinfo = payload;
            console.log('ID token payload:', Object.keys(payload));
            console.log('Full ID token payload:', JSON.stringify(payload, null, 2));
        } else {
            console.log('No ID token received');
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
        }

        return { tokenSet, userinfo };
    } catch (error) {
        console.error('Token exchange error:', error);
        throw error;
    }
}

async function logout(req) {
    if (!req.session.tokenSet) {
        console.log('No token set in session, nothing to logout');
        return { success: true };
    }

    if (!config) {
        console.log('OIDC client not initialized, destroying session only');
        req.session.destroy();
        return { success: true };
    }

    const idToken = req.session.tokenSet.id_token;

    // Get the end session endpoint from the server metadata
    const metadata = config.serverMetadata();
    const endSessionEndpoint = metadata.end_session_endpoint;

    console.log('End session endpoint:', endSessionEndpoint);

    // Clear the session
    req.session.destroy((err) => {
        if (err) console.error('Error destroying session:', err);
        else console.log('Session destroyed successfully');
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

        console.log('Constructed logout URL:', logoutUrl.href);
        return { logoutUrl: logoutUrl.href };
    }

    return { success: true };
}

module.exports = {
    initializeOIDCClient,
    getConfig,
    generateAuthUrl,
    handleCallback,
    logout,
};