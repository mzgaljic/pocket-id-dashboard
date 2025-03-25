// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { validateEnvironment } = require('./utils/validateEnv');
const { initializeDatabase, closeDatabase } = require('./database');
const { createSessionStore } = require('./services/sessionStore');
const { sessionEncryption } = require('./middleware/sessionEncryption');
const { sessionValidator } = require('./middleware/sessionValidator');
const { startSessionCleanup } = require('./services/sessionCleanup');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { auth } = require('./middleware/auth');
const appRoutes = require('./routes/apps');
const oidcService = require('./services/oidcService');
const emailService = require('./services/emailService');
const logger = require('./utils/logger');

if (process.env.NODE_ENV !== 'production') {
    process.env.NODE_ENV = 'development';
}
// Validate environment variables
if (!validateEnvironment()) {
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Print environment variables (excluding secrets)
logger.info('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    OIDC_DISCOVERY_URL: process.env.OIDC_DISCOVERY_URL,
    OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID,
    OIDC_REDIRECT_URI: process.env.OIDC_REDIRECT_URI,
    OIDC_POST_LOGOUT_REDIRECT_URI: process.env.OIDC_POST_LOGOUT_REDIRECT_URI,
    POCKET_ID_BASE_URL: process.env.POCKET_ID_BASE_URL,
    APP_TITLE: process.env.APP_TITLE,
    APP_SSO_PROVIDER_NAME: process.env.APP_SSO_PROVIDER_NAME,
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
});

// Basic middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.CLIENT_ORIGIN || 'https://your-production-domain.com'
        : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Initialize database and start server after initialization
async function startServer() {
    try {
        // Initialize database first
        await initializeDatabase();
        logger.info('Database initialized successfully');

        // Initialize session with persistent store
        const sessionConfig = {
            name: process.env.SESSION_COOKIE_NAME || 'pocket_id_session',
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            store: createSessionStore(session),
            cookie: {
                secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
                httpOnly: true,
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            }
        };
        // If behind a proxy (like Docker, traefik, etc.), trust the first proxy
        if (process.env.NODE_ENV === 'production') {
            app.set('trust proxy', 1);
            // Only set secure cookies if not explicitly disabled
            if (process.env.COOKIE_SECURE !== 'false') {
                sessionConfig.cookie.secure = true;
            }
        }

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
        app.use(sessionValidator);
        app.use(sessionEncryption);


        // guard against Session fixation
        app.use((req, res, next) => {
            // Regenerate session on login
            if (req.path === '/auth/callback' && req.method === 'GET') {
                // Skip if no session
                if (!req.session) {
                    return next();
                }

                // Store old session data
                const oldSessionData = { ...req.session };

                req.session.regenerate((err) => {
                    if (err) {
                        logger.error('Error regenerating session:', err);
                        return next(err);
                    }

                    // Copy properties from old session data
                    Object.assign(req.session, oldSessionData);

                    // Save the session to ensure it's properly stored
                    req.session.save((err) => {
                        if (err) {
                            logger.error('Error saving regenerated session:', err);
                        }
                        next();
                    });
                });
            } else {
                next();
            }
        });

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
        try {
            await oidcService.initializeOIDCClient();
            logger.info('OIDC client initialized successfully');
            oidcInitialized = true;
        } catch (error) {
            logger.error('Failed to initialize OIDC client:', error);
            // Continue running the server even if OIDC fails to initialize
        }
        // Make sure the OIDC status is available to routes
        app.use((req, res, next) => {
            req.oidcInitialized = oidcInitialized;
            next();
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

        // Initialize email service
        try {
            const initialized = await emailService.initializeEmailService();
            if (initialized) {
                logger.info('Email service initialized successfully');
            } else {
                logger.warn('Email service initialization skipped or failed');
            }
        } catch (error) {
            logger.error('Failed to initialize email service:', error);
        }

        // Set up routes
        app.use(checkOIDCInitialized);
        app.use('/api/apps', auth, appRoutes);
        app.use('/auth', require('./routes/auth'));
        app.use('/api/config', require('./routes/config'));

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

        app.use(notFoundHandler);
        app.use(errorHandler);

        startSessionCleanup(120);

        // Start the server
        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown handler
let isShuttingDown = false;
function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`${signal} signal received, shutting down gracefully`);

    // Set a timeout for the shutdown to complete
    const forcedShutdownTimeout = setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
    }, 30000); // 30 seconds timeout

    // Close the server first to stop accepting new connections
    server.close(async () => {
        logger.info('HTTP server closed, cleaning up resources');

        try {
            // Close the database connection
            await closeDatabase();
            logger.info('Database connection closed');

            // Clear the timeout and exit gracefully
            clearTimeout(forcedShutdownTimeout);
            process.exit(0);
        } catch (error) {
            logger.error('Error during graceful shutdown:', error);
            process.exit(1);
        }
    });
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();