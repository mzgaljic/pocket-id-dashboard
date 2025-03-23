// server/services/pocketIdService.js
const axios = require('axios');
const https = require('https');
const logger = require('../utils/logger');

// Base URL for the Pocket-ID API
const API_BASE_URL = process.env.POCKET_ID_API_URL;
const API_KEY = process.env.POCKET_ID_API_KEY;

const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 25,
    timeout: 30000,
    rejectUnauthorized: process.env.NODE_ENV === 'production' // Allow self-signed certs in dev
});

// Create an axios instance with default headers and improved connection handling
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Accept': 'application/json',
        'X-API-KEY': API_KEY
    },
    httpsAgent,
    timeout: 10000 // 10 second timeout
});

// Simple in-memory cache for OIDC clients list only
const cache = {
    clients: {
        data: null,
        timestamp: null
    }
};

// Cache expiration time (in milliseconds)
const CACHE_EXPIRY = 3600000; // 1 hour

/**
 * Check if cache is valid
 * @param {Object} cacheEntry - Cache entry with data and timestamp
 * @returns {boolean} - Whether the cache is valid
 */
function isCacheValid(cacheEntry) {
    return (
        cacheEntry &&
        cacheEntry.data &&
        cacheEntry.timestamp &&
        Date.now() - cacheEntry.timestamp < CACHE_EXPIRY
    );
}

/**
 * Get a list of all OIDC clients
 * @param {Object} options - Query parameters
 * @returns {Promise<Object>} - List of clients and pagination info
 */
async function listOIDCClients(options = {}) {
    try {
        // Check cache first
        if (isCacheValid(cache.clients)) {
            logger.debug('Using cached clients list');
            return cache.clients.data;
        }

        const params = {
            page: options.page || 1,
            limit: options.limit || 100, // Get more items per page
            sort_column: options.sortColumn || 'name',
            sort_direction: options.sortDirection || 'asc'
        };

        if (options.search) {
            params.search = options.search;
        }

        logger.info('Fetching fresh clients list from API');
        const response = await apiClient.get('/oidc/clients', { params });

        // Update cache
        cache.clients = {
            data: response.data,
            timestamp: Date.now()
        };

        logger.debug(`Retrieved ${response.data.data.length} clients from API`);
        return response.data;
    } catch (error) {
        logger.error('Error fetching OIDC clients:', error);
        throw new Error(`Failed to fetch OIDC clients: ${error.message}`);
    }
}

/**
 * Get details for a specific OIDC client
 * @param {string} clientId - The client ID
 * @returns {Promise<Object>} - Client details
 */
async function getOIDCClient(clientId) {
    try {
        // Use a lower log level (verbose) for these frequent operations
        logger.verbose(`Fetching OIDC client details: ${clientId}`);

        const response = await apiClient.get(`/oidc/clients/${clientId}`);
        return response.data;
    } catch (error) {
        logger.error(`Error fetching OIDC client ${clientId}:`, error);
        throw new Error(`Failed to fetch OIDC client ${clientId}: ${error.message}`);
    }
}

/**
 * Get the logo for a specific OIDC client
 * @param {string} clientId - The client ID
 * @returns {Promise<Buffer>} - Logo image data
 */
async function getOIDCClientLogo(clientId) {
    try {
        logger.debug('Fetching logo for OIDC client', { clientId });
        const response = await apiClient.get(`/oidc/clients/${clientId}/logo`, {
            responseType: 'arraybuffer'
        });
        return response.data;
    } catch (error) {
        logger.error(`Error fetching logo for OIDC client ${clientId}:`, error);
        throw new Error(`Failed to fetch logo for OIDC client ${clientId}: ${error.message}`);
    }
}

/**
 * Extract base URL from a callback URL
 * @param {string} url - Full callback URL
 * @returns {string} - Base URL
 */
function extractBaseUrl(url) {
    try {
        if (!url) return '#';
        const parsedUrl = new URL(url);
        return `${parsedUrl.protocol}//${parsedUrl.host}`;
    } catch (error) {
        logger.error('Error parsing URL:', error, { url });
        return '#';
    }
}

/**
 * Get all groups a user belongs to
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} - Array of groups the user belongs to
 */
async function getUserGroups(userId) {
    try {
        logger.info('Fetching groups for user', { userId });

        try {
            const response = await apiClient.get(`/users/${userId}/groups`);
            logger.debug(`Retrieved ${response.data.length} groups for user`, { userId });
            return response.data;
        } catch (error) {
            // If we get a connection error, reset the connection and retry once
            if (error.message && (
                error.message.includes('ECONNRESET') ||
                error.message.includes('socket hang up') ||
                error.message.includes('Cannot read properties of undefined')
            )) {
                logger.warn('Connection error detected, resetting connection and retrying', {
                    userId,
                    error: error.message
                });

                // Reset the connection
                resetConnection();

                // Retry the request
                const retryResponse = await apiClient.get(`/users/${userId}/groups`);
                logger.info(`Retry successful, retrieved ${retryResponse.data.length} groups for user`, { userId });
                return retryResponse.data;
            }

            // If not a connection error or retry failed, throw the error
            throw error;
        }
    } catch (error) {
        logger.error(`Error fetching groups for user ${userId}:`, error);
        throw new Error(`Failed to fetch groups for user ${userId}: ${error.message}`);
    }
}

/**
 * Get all accessible OIDC clients for a user based on their group membership
 * @param {string[]} userGroups - Array of group names the user belongs to
 * @returns {Promise<Array>} - Array of accessible clients with details
 */
async function getAccessibleOIDCClients(userGroups) {
    try {
        // Get all clients
        logger.info('Fetching clients for access check');
        const { data: clients } = await listOIDCClients();

        // Array to store accessible clients with details
        const accessibleClients = [];

        logger.debug(`Processing ${clients.length} clients for access check`);

        // For each client, get details and check if user has access
        for (const client of clients) {
            try {
                // Removed verbose logging for each client check
                const clientDetails = await getOIDCClient(client.id);

                // Extract group names from allowedUserGroups
                const allowedGroups = clientDetails.allowedUserGroups.map(group => group.name);

                // Check if user is in any of the allowed groups
                const hasAccess = allowedGroups.some(group => userGroups.includes(group));

                // Add client to accessible list if user has access
                if (hasAccess) {
                    // Extract base URL from the first callback URL
                    const redirectUri = client.callbackURLs && client.callbackURLs.length > 0
                        ? extractBaseUrl(client.callbackURLs[0])
                        : '#';

                    accessibleClients.push({
                        id: client.id,
                        name: client.name,
                        description: clientDetails.description || `Access to ${client.name}`,
                        logo: client.hasLogo ? `${API_BASE_URL}/oidc/clients/${client.id}/logo` : null,
                        redirectUri,
                        allowedGroups,
                        hasAccess
                    });
                }
            } catch (error) {
                logger.error(`Error processing client ${client.id}:`, error);
                // Continue with next client
            }
        }

        // Log a summary of accessible apps instead of individual checks
        logger.info(`Found accessible clients ${JSON.stringify({ count: accessibleClients.length })}`);

        // Only log the detailed list at debug level
        logger.debug('Accessible apps', {
            apps: accessibleClients.map(app => ({
                id: app.id,
                name: app.name,
                hasRedirectUri: app.redirectUri !== '#'
            }))
        });

        return accessibleClients;
    } catch (error) {
        logger.error('Error getting accessible OIDC clients:', error);
        throw new Error(`Failed to get accessible OIDC clients: ${error.message}`);
    }
}

/**
 * Get all OIDC clients with access information for a user
 * @param {string[]} userGroups - Array of group names the user belongs to
 * @returns {Promise<Array>} - Array of all clients with access information
 */
async function getAllOIDCClientsWithAccessInfo(userGroups) {
    try {
        // Get all clients
        logger.info('Fetching all clients with access information');
        const { data: clients } = await listOIDCClients();

        // Array to store all clients with access information
        const allClients = [];
        let accessibleCount = 0; // Changed from const to let

        logger.debug(`Processing ${clients.length} clients for access information`);

        // For each client, get details and check if user has access
        for (const client of clients) {
            try {
                const clientDetails = await getOIDCClient(client.id);

                // Extract group names from allowedUserGroups
                const allowedGroups = clientDetails.allowedUserGroups.map(group => group.name);

                // Check if user is in any of the allowed groups
                const hasAccess = allowedGroups.some(group => userGroups.includes(group));
                if (hasAccess) accessibleCount++;

                // Extract base URL from the first callback URL
                const redirectUri = client.callbackURLs && client.callbackURLs.length > 0
                    ? extractBaseUrl(client.callbackURLs[0])
                    : '#';

                // Add client to list with access information
                allClients.push({
                    id: client.id,
                    name: client.name,
                    description: clientDetails.description || `Access to ${client.name}`,
                    logo: client.hasLogo ? `${API_BASE_URL}/oidc/clients/${client.id}/logo` : null,
                    redirectUri,
                    allowedGroups,
                    hasAccess
                });
            } catch (error) {
                logger.error(`Error processing client ${client.id}:`, error);
                // Continue with next client
            }
        }

        // Log a summary instead of individual app processing
        logger.info(`Processed total clients ${JSON.stringify({
            total: allClients.length,
            accessible: accessibleCount
        })}`);

        // Only log the detailed list at debug level
        logger.debug('All apps with access info', {
            apps: allClients.map(app => ({
                id: app.id,
                name: app.name,
                hasAccess: app.hasAccess
            }))
        });

        return allClients;
    } catch (error) {
        logger.error('Error getting all OIDC clients with access info:', error);
        throw new Error(`Failed to get all OIDC clients with access info: ${error.message}`);
    }
}

/**
 * Reset the API client connection
 * This can help resolve stale connection issues
 */
function resetConnection() {
    logger.info('Resetting API client connection');

    // Create a new HTTPS agent
    const newHttpsAgent = new https.Agent({
        keepAlive: true,
        maxSockets: 25,
        timeout: 30000,
        rejectUnauthorized: process.env.NODE_ENV === 'production'
    });

    // Update the API client with the new agent
    apiClient.defaults.httpsAgent = newHttpsAgent;

    // Clear any cached data
    clearCache();

    logger.info('API client connection reset complete');
}

function clearCache() {
    cache.clients = {
        data: null,
        timestamp: null
    };
    logger.info('Cache cleared');
}

module.exports = {
    listOIDCClients,
    getOIDCClient,
    getOIDCClientLogo,
    getAccessibleOIDCClients,
    getAllOIDCClientsWithAccessInfo,
    getUserGroups,
    clearCache,
    resetConnection
};