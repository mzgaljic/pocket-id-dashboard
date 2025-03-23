// server/services/sessionStore.js
const { ConnectSessionKnexStore } = require('connect-session-knex');
const { db } = require('../database');
const logger = require('../utils/logger');

/**
 * Create a session store using Knex
 * @returns {Object} - Configured session store
 */
function createSessionStore(session) {
    logger.info('Initializing session store with database');

    return new ConnectSessionKnexStore({
        knex: db,
        tableName: 'sessions',       // Name of the sessions table
        createTable: true,           // Create the table if it doesn't exist
        cleanupInterval: 60000,      // Clear expired sessions every minute
        sidFieldName: 'sid',         // Session ID field name
    });
}

module.exports = { createSessionStore };