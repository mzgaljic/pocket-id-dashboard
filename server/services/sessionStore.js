// server/services/sessionStore.js
const { ConnectSessionKnexStore } = require('connect-session-knex');
const { db } = require('../database');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

/**
 * Create a session store using Knex
 * @returns {Object} - Configured session store
 */
function createSessionStore(session) {
    logger.info('Initializing session store with database');

    // Ensure the database directory exists and is writable
    const dbDir = path.dirname(process.env.DB_FILENAME || './data/pocket-id-dashboard.db');
    if (!fs.existsSync(dbDir)) {
        try {
            fs.mkdirSync(dbDir, { recursive: true });
            logger.info(`Created database directory: ${dbDir}`);
        } catch (error) {
            logger.error(`Failed to create database directory: ${dbDir}`, error);
        }
    }

    return new ConnectSessionKnexStore({
        knex: db,
        tableName: 'sessions',
        createTable: true,
        clearInterval: 60000,
        sidfieldname: 'sid',
    });
}

module.exports = { createSessionStore };