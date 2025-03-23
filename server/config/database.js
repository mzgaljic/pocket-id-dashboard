// server/config/database.js
const path = require('path');
const logger = require('../utils/logger');

// Get database configuration from environment variables
const dbConfig = {
    client: process.env.DB_CLIENT || 'better-sqlite3',
    connection: {
        filename: process.env.DB_FILENAME || path.join(__dirname, '../../data/pocket-id-dashboard.db')
    },
    useNullAsDefault: true,
    // SQLite-specific settings for better-sqlite3
    pool: {
        min: 1,
        max: 1
    }
};

// Add pragmas for better-sqlite3 client
if (dbConfig.client === 'better-sqlite3') {
    dbConfig.connection.options = {
        // These are the pragmas for better-sqlite3
        pragma: {
            journal_mode: 'WAL',      // Use WAL mode for better concurrency
            synchronous: 'NORMAL',    // Balance between durability and performance
            busy_timeout: 5000        // Wait up to 5 seconds when database is busy
        }
    };
    logger.info('Configured better-sqlite3 with WAL mode and pragmas');
}
// Add specific settings for sqlite3 client
else if (dbConfig.client === 'sqlite3') {
    // For sqlite3, we can use the afterCreate hook
    dbConfig.pool.afterCreate = (conn, cb) => {
        logger.debug('Setting SQLite pragmas');
        conn.run('PRAGMA journal_mode = WAL;', (err) => {
            if (err) {
                logger.error('Error setting journal_mode', err);
                return cb(err);
            }
            conn.run('PRAGMA synchronous = NORMAL;', (err) => {
                if (err) {
                    logger.error('Error setting synchronous mode', err);
                    return cb(err);
                }
                conn.run('PRAGMA busy_timeout = 5000;', (err) => {
                    if (err) {
                        logger.error('Error setting busy_timeout', err);
                    }
                    cb(err);
                });
            });
        });
    };
    logger.info('Configured sqlite3 with WAL mode and pragmas');
}

// Enable debug logging in development
if (process.env.NODE_ENV === 'development') {
    dbConfig.debug = true;
}

module.exports = dbConfig;