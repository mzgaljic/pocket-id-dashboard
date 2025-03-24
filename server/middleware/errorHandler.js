// server/middleware/errorHandler.js
const logger = require('../utils/logger');

function notFoundHandler(req, res, next) {
    // Handle 404 errors
    res.status(404);

    // API requests should return JSON
    if (req.path.startsWith('/api/')) {
        return res.json({ error: 'Not Found', message: 'The requested resource was not found.' });
    }

    // For non-API requests in production, serve the Vue app (which will handle 404s)
    if (process.env.NODE_ENV === 'production' && !req.path.startsWith('/auth/')) {
        return res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
    }

    // Otherwise, send a simple 404 message
    res.send('Not Found');
}

function errorHandler(err, req, res, next) {
    // Log the error
    logger.error('Unhandled error:', err);

    // Set status code
    const statusCode = err.statusCode || 500;
    res.status(statusCode);

    // Prepare error response
    const errorResponse = {
        error: err.name || 'Internal Server Error',
        message: process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err.message
    };

    // Include stack trace in development
    if (process.env.NODE_ENV !== 'production' && err.stack) {
        errorResponse.stack = err.stack;
    }

    // Send error response
    res.json(errorResponse);
}

module.exports = { notFoundHandler, errorHandler };