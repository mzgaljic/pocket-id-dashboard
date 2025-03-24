// server/database/migrate.js
require('dotenv').config();
const { initializeDatabase, closeDatabase } = require('./index');
const logger = require('../utils/logger');

async function runMigrations() {
    try {
        logger.info('Running database migrations...');
        await initializeDatabase();
        logger.info('Database migrations completed successfully');
        await closeDatabase();
        process.exit(0);
    } catch (error) {
        logger.error('Database migration failed:', error);
        process.exit(1);
    }
}

runMigrations();