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

const app = express();
const PORT = process.env.PORT || 3000;

// Print environment variables (excluding secrets)
console.log('Environment:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- OIDC_DISCOVERY_URL:', process.env.OIDC_DISCOVERY_URL);
console.log('- OIDC_CLIENT_ID:', process.env.OIDC_CLIENT_ID);
console.log('- OIDC_CLIENT_SECRET:', process.env.OIDC_CLIENT_SECRET ? '[SET]' : '[NOT SET]');
console.log('- OIDC_REDIRECT_URI:', process.env.OIDC_REDIRECT_URI);
console.log('- OIDC_POST_LOGOUT_REDIRECT_URI:', process.env.OIDC_POST_LOGOUT_REDIRECT_URI);

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.CLIENT_ORIGIN || 'https://your-production-domain.com'
        : ['http://localhost:5173', 'http://localhost:3000'], // Allow both Vue dev server and Express server
    credentials: true // Important for cookies/sessions
}));

app.use(express.json());
app.use(cookieParser());

const sessionConfig = {
    name: process.env.SESSION_COOKIE_NAME || 'pocket_id_session',
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: true, // Changed to true to ensure session is saved
    saveUninitialized: true, // Changed to true to create session for all requests
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax', // Changed to lax for all environments to ensure cookies are sent with redirects
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
};

console.log('Session configuration:', {
    name: sessionConfig.name,
    secret: sessionConfig.secret ? '[SET]' : '[NOT SET]',
    cookie: {
        secure: sessionConfig.cookie.secure,
        httpOnly: sessionConfig.cookie.httpOnly,
        sameSite: sessionConfig.cookie.sameSite
    }
});

app.use(session(sessionConfig));

// Request logger middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Initialize OIDC client
let oidcInitialized = false;
oidcService.initializeOIDCClient()
    .then(() => {
        console.log('OIDC client initialized successfully');
        oidcInitialized = true;
    })
    .catch(error => {
        console.error('Failed to initialize OIDC client:', error);
        // Continue running the server even if OIDC fails to initialize
    });

// Middleware to check if OIDC is initialized
const checkOIDCInitialized = (req, res, next) => {
    if (!oidcInitialized &&
        req.path.startsWith('/auth') &&
        !req.path.includes('/status') &&
        !req.path.includes('/user')) {
        console.log('OIDC not initialized, rejecting request to:', req.path);
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});