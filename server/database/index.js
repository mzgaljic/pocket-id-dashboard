// server/database/index.js
const fs = require('fs');
const path = require('path');
const knex = require('knex');
const dbConfig = require('../config/database');
const logger = require('../utils/logger');

// Create data directory if it doesn't exist
const dataDir = path.dirname(dbConfig.connection.filename);
if (!fs.existsSync(dataDir)) {
    logger.info(`Creating data directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database connection
const db = knex(dbConfig);

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