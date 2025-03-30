// server/database/index.js
const fs = require('fs');
const path = require('path');
const knex = require('knex');
const dbConfig = require('../config/database');
const logger = require('../utils/logger');

// Create data directory if needed
if (dbConfig.client === 'better-sqlite3' || dbConfig.client === 'sqlite3') {
    const dataDir = path.dirname(dbConfig.connection.filename);
    if (!fs.existsSync(dataDir)) {
        logger.info(`Creating data directory: ${dataDir}`);
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

// Create a custom logger for Knex that respects our log levels
const customKnexLogger = {
    warn(message) {
        logger.warn('Database warning:', message);
    },
    error(message) {
        logger.error('Database error:', message);
    },
    deprecate(message) {
        logger.warn('Database deprecation:', message);
    },
    debug(message) {
        // Only log SQL queries at debug level or below
        if (process.env.LOG_LEVEL === 'debug' ||
            process.env.LOG_LEVEL === 'verbose' ||
            process.env.LOG_LEVEL === 'silly') {
            logger.debug('Database query:', message);
        }
    }
};

// Initialize database connection
const db = knex({
    ...dbConfig,
    log: customKnexLogger
});

// Database initialization function
async function initializeDatabase() {
    try {
        logger.info('Initializing database...');
        logger.debug('Database configuration:', {
            client: dbConfig.client,
            filename: dbConfig.connection.filename,
            options: dbConfig.connection.options ? 'Set' : 'Not set'
        });

        // Check if database is accessible
        await db.raw('SELECT 1');
        logger.info('Database connection successful');

        // Run migrations

        const hasRequestsTable = await db.schema.hasTable('access_requests');

        if (!hasRequestsTable) {
            logger.info('Creating access_requests table');
            await db.schema.createTable('access_requests', (table) => {
                table.increments('id').primary();
                table.string('user_id').notNullable();
                table.string('app_id').notNullable();
                table.timestamp('requested_at').defaultTo(db.fn.now());
                table.string('status').defaultTo('pending');
                table.text('notes');

                // Add indexes for performance
                table.index(['user_id', 'app_id']);

                // Add unique constraint to prevent duplicate requests
                table.unique(['user_id', 'app_id']);
            });
            logger.info('Created access_requests table');
        } else {
            logger.info('access_requests table already exists');
        }

        const hasSessionsTable = await db.schema.hasTable('sessions');
        if (!hasSessionsTable) {
            logger.info('Creating sessions table');
            await db.schema.createTable('sessions', (table) => {
                table.string('sid').primary();
                table.json('sess').notNullable();
                table.timestamp('expired').notNullable().index();
            });
            logger.info('Created sessions table');
        } else {
            logger.info('sessions table already exists');
        }

        return true;
    } catch (error) {
        logger.error('Database initialization failed:', error);
        throw error;
    }
}

// Function to close database connection
async function closeDatabase() {
    try {
        logger.info('Closing database connection...');
        await db.destroy();
        logger.info('Database connection closed');
    } catch (error) {
        logger.error('Error closing database connection:', error);
    }
}

// Export database connection and functions
module.exports = {
    db,
    initializeDatabase,
    closeDatabase
};