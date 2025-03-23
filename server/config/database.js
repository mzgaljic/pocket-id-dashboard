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
} else if (dbConfig.client === 'pg') {
    dbConfig.connection = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'pocket_id_dashboard',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

    logger.info('Configured PostgreSQL connection', {
        host: dbConfig.connection.host,
        port: dbConfig.connection.port,
        database: dbConfig.connection.database,
        ssl: !!dbConfig.connection.ssl
    });
}

// Disable debug mode by default
dbConfig.debug = false;

// Only enable debug mode in development AND when log level is debug or lower
if (process.env.NODE_ENV === 'development' &&
    ['debug', 'verbose', 'silly'].includes(process.env.LOG_LEVEL || 'info')) {
    dbConfig.debug = true;
}

module.exports = dbConfig;