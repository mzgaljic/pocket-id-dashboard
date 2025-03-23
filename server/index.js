// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { auth } = require('./middleware/auth');
const appRoutes = require('./routes/apps');
const oidcService = require('./services/oidcService');
const logger = require('./utils/logger');
const app = express();
const PORT = process.env.PORT || 3000;

// Print environment variables (excluding secrets)
logger.info('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    OIDC_DISCOVERY_URL: process.env.OIDC_DISCOVERY_URL,
    OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID,
    OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET ? '[SET]' : '[NOT SET]',
    OIDC_REDIRECT_URI: process.env.OIDC_REDIRECT_URI,
    OIDC_POST_LOGOUT_REDIRECT_URI: process.env.OIDC_POST_LOGOUT_REDIRECT_URI,
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
});

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.CLIENT_ORIGIN || 'https://your-production-domain.com'
        : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use('/assets', express.static(path.join(__dirname, 'assets')));

const sessionConfig = {
    name: process.env.SESSION_COOKIE_NAME || 'pocket_id_session',
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
};

logger.info('Session configuration:', {
    name: sessionConfig.name,
    secret: sessionConfig.secret ? '[SET]' : '[NOT SET]',
    cookie: {
        secure: sessionConfig.cookie.secure,
        httpOnly: sessionConfig.cookie.httpOnly,
        sameSite: sessionConfig.cookie.sameSite
    }
});

app.use(session(sessionConfig));

// Request logger middleware - more selective logging
app.use((req, res, next) => {
    // Skip logging for static assets and frequent API calls in production
    const isFrequentEndpoint = req.path === '/api/apps' || req.path === '/auth/status';
    const isStaticAsset = req.path.startsWith('/assets/') || req.path.includes('.');

    if (process.env.NODE_ENV === 'production' && (isStaticAsset || (isFrequentEndpoint && req.method === 'GET'))) {
        return next();
    }

    logger.http(`${req.method} ${req.url} ${JSON.stringify({
        ip: req.ip,
        userAgent: req.headers['user-agent'] ? 'present' : 'missing'
    })}`);
    next();
});

// Initialize OIDC client
let oidcInitialized = false;
oidcService.initializeOIDCClient()
    .then(() => {
        logger.info('OIDC client initialized successfully');
        oidcInitialized = true;
    })
    .catch(error => {
        logger.error('Failed to initialize OIDC client:', error);
        // Continue running the server even if OIDC fails to initialize
    });

// Middleware to check if OIDC is initialized
const checkOIDCInitialized = (req, res, next) => {
    if (!oidcInitialized &&
        req.path.startsWith('/auth') &&
        !req.path.includes('/status') &&
        !req.path.includes('/user')) {
        logger.warn('OIDC not initialized, rejecting request to:', { path: req.path });
        return res.status(503).json({
            error: 'Service Unavailable',
            message: 'OIDC service is not initialized yet. Please try again later.'
        });
    }
    next();
};

app.use(checkOIDCInitialized);
app.use('/api/apps', auth, appRoutes);
app.use('/auth', require('./routes/auth'));

// Handle SPA routes - this should be after all API routes
// In development, we'll redirect to the Vue dev server
if (process.env.NODE_ENV === 'development') {
    app.get('*', (req, res) => {
        // Redirect to the Vue dev server for all non-API routes
        res.redirect(`http://localhost:5173${req.originalUrl}`);
    });
} else {
    // In production, serve the static files
    app.use(express.static(path.join(__dirname, '../client/dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
    });
});

app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});