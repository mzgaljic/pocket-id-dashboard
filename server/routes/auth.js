// server/routes/auth.js
const express = require('express');
const router = express.Router();
const oidcService = require('../services/oidcService');

// Login route - redirects to OIDC provider
router.get('/login', async (req, res) => {
    try {
        console.log('Login route accessed');
        const authUrl = await oidcService.generateAuthUrl(req);
        console.log('Generated auth URL:', authUrl);
        res.redirect(authUrl);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Authentication failed', message: error.message });
    }
});

// OIDC callback handler
// server/routes/auth.js - Update the callback route
router.get('/callback', async (req, res) => {
    try {
        console.log('Callback route accessed');
        console.log('Query parameters:', req.query);
        console.log('Session state:', req.session.state);
        console.log('Session code verifier exists:', !!req.session.codeVerifier);

        // If we don't have the code verifier in the session, show an error
        if (!req.session.codeVerifier) {
            console.error('No code verifier in session - session may have been lost');
            return res.status(400).send('Authentication failed: Session lost or expired. Please try again.');
        }

        // Store code verifier and state for debugging
        const codeVerifier = req.session.codeVerifier;
        const state = req.session.state;

        try {
            const { tokenSet, userinfo } = await oidcService.handleCallback(req);
            console.log('Token set received:', Object.keys(tokenSet));
            console.log('User info received:', userinfo ? Object.keys(userinfo) : 'none');

            // Extract user information and group claims
            req.session.user = {
                id: userinfo.sub,
                name: userinfo.name || `${userinfo.given_name || ''} ${userinfo.family_name || ''}`.trim() || userinfo.sub,
                email: userinfo.email,
                groups: userinfo.groups || [], // Assuming 'groups' claim is provided by Pocket-ID
                picture: userinfo.picture
            };

            console.log('User session created:', req.session.user);

            // Redirect to the dashboard
            res.redirect('/dashboard');
        } catch (error) {
            console.error('Token exchange error:', error);

            // Let's try a more direct approach if the library is failing
            console.log('Attempting manual token exchange as fallback...');

            try {
                // Get token endpoint from config
                const tokenEndpoint = oidcService.getConfig().serverMetadata().token_endpoint;
                console.log('Token endpoint:', tokenEndpoint);

                // Prepare token request
                const params = new URLSearchParams();
                params.append('grant_type', 'authorization_code');
                params.append('code', req.query.code);
                params.append('redirect_uri', process.env.OIDC_REDIRECT_URI);
                params.append('client_id', process.env.OIDC_CLIENT_ID);

                if (process.env.OIDC_CLIENT_SECRET) {
                    params.append('client_secret', process.env.OIDC_CLIENT_SECRET);
                }

                params.append('code_verifier', codeVerifier);

                console.log('Token request params:', Object.fromEntries(params));

                // Make token request
                const response = await fetch(tokenEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: params
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Manual token exchange failed:', errorData);
                    throw new Error(`Token exchange failed: ${errorData.error}`);
                }

                const tokenData = await response.json();
                console.log('Manual token exchange successful:', Object.keys(tokenData));

                // Parse ID token if present
                let userinfo = {};
                if (tokenData.id_token) {
                    const payload = JSON.parse(
                        Buffer.from(tokenData.id_token.split('.')[1], 'base64').toString()
                    );
                    userinfo = payload;
                    console.log('ID token payload:', Object.keys(payload));
                }

                // Create user session
                req.session.user = {
                    id: userinfo.sub,
                    name: userinfo.name || `${userinfo.given_name || ''} ${userinfo.family_name || ''}`.trim() || userinfo.sub,
                    email: userinfo.email,
                    groups: userinfo.groups || [],
                    picture: userinfo.picture
                };

                // Store token information
                req.session.tokenSet = {
                    access_token: tokenData.access_token,
                    id_token: tokenData.id_token,
                    refresh_token: tokenData.refresh_token,
                };

                console.log('User session created manually:', req.session.user);

                // Redirect to the dashboard
                res.redirect('/dashboard');
            } catch (manualError) {
                console.error('Manual token exchange also failed:', manualError);
                res.status(500).send(`Authentication failed: ${error.message}. Manual attempt also failed: ${manualError.message}`);
            }
        }
    } catch (error) {
        console.error('Callback error:', error);
        res.status(500).send(`Authentication failed: ${error.message}`);
    }
});

// Logout route
router.get('/logout', async (req, res) => {
    try {
        console.log('Logout route accessed');
        const { logoutUrl, success } = await oidcService.logout(req);

        if (logoutUrl) {
            console.log('Redirecting to logout URL:', logoutUrl);
            res.redirect(logoutUrl);
        } else if (success) {
            console.log('Logout successful, redirecting to home');
            res.redirect('/');
        } else {
            throw new Error('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed', message: error.message });
    }
});

// Get current user
router.get('/user', (req, res) => {
    console.log('User route accessed, session:', req.session.user ? 'exists' : 'does not exist');

    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json(req.session.user);
});

// Check auth status - for client-side auth checks
router.get('/status', (req, res) => {
    console.log('Status route accessed, session:', req.session.user ? 'exists' : 'does not exist');

    let oidcInitialized = false;
    try {
        oidcService.getConfig();
        oidcInitialized = true;
    } catch (error) {
        console.log('OIDC not initialized yet');
    }

    res.json({
        authenticated: !!req.session.user,
        user: req.session.user || null,
        oidcInitialized
    });
});

// TODO: remove this after testing locally
router.get('/test-config', (req, res) => {
    try {
        const config = oidcService.getConfig();
        const metadata = config.serverMetadata();

        res.json({
            issuer: metadata.issuer,
            authorization_endpoint: metadata.authorization_endpoint,
            token_endpoint: metadata.token_endpoint,
            userinfo_endpoint: metadata.userinfo_endpoint,
            jwks_uri: metadata.jwks_uri,
            end_session_endpoint: metadata.end_session_endpoint,
            redirect_uri: process.env.OIDC_REDIRECT_URI,
            post_logout_redirect_uri: process.env.OIDC_POST_LOGOUT_REDIRECT_URI
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get OIDC configuration',
            message: error.message
        });
    }
});

// TODO: remove this after testing locally
router.get('/direct-login', (req, res) => {
    try {
        const config = oidcService.getConfig();
        const metadata = config.serverMetadata();

        // Generate a simple login URL without PKCE for testing
        const loginUrl = new URL(metadata.authorization_endpoint);
        loginUrl.searchParams.set('client_id', process.env.OIDC_CLIENT_ID);
        loginUrl.searchParams.set('response_type', 'code');
        loginUrl.searchParams.set('redirect_uri', process.env.OIDC_REDIRECT_URI);
        loginUrl.searchParams.set('scope', 'openid profile email');
        loginUrl.searchParams.set('state', 'test-state-' + Date.now());

        console.log('Direct login URL:', loginUrl.href);
        res.redirect(loginUrl.href);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to generate direct login URL',
            message: error.message
        });
    }
});

// Add this to server/routes/auth.js
router.get('/debug-session', (req, res) => {
    res.json({
        sessionExists: !!req.session,
        sessionId: req.session.id,
        hasCodeVerifier: !!req.session.codeVerifier,
        hasState: !!req.session.state,
        hasUser: !!req.session.user,
        // Don't expose the actual code verifier in production
        codeVerifierLength: req.session.codeVerifier ? req.session.codeVerifier.length : 0,
        stateValue: req.session.state,
        cookie: req.session.cookie ? {
            maxAge: req.session.cookie.maxAge,
            expires: req.session.cookie.expires,
            secure: req.session.cookie.secure,
            httpOnly: req.session.cookie.httpOnly,
            sameSite: req.session.cookie.sameSite
        } : null
    });
});


module.exports = router;