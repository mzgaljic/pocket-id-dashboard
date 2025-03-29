// server/services/pocketIdService.js
const https = require('https');
const {URL} = require('url');
const logger = require('../utils/logger');
const { findClientMetadata, clearMetadataCache } = require('../utils/metadataLoader');



// Base URL for the Pocket-ID API
const POCKET_ID_BASE_URL = process.env.POCKET_ID_BASE_URL;
const API_KEY = process.env.POCKET_ID_API_KEY;

const cache = {
    clients: {
        data: null,
        timestamp: null
    },
    // Add caches for user groups and accessible apps
    userGroups: {}, // Will be keyed by userId
    accessibleApps: {} // Will be keyed by a hash of the userGroups array
};

function hashArray(arr) {
    return arr.sort().join('|');
}

// cache TTLs
const CACHE_EXPIRY = 3600000; // 1 hour for clients
const USER_GROUPS_CACHE_EXPIRY = 10000; // 10 seconds for user groups
const ACCESSIBLE_APPS_CACHE_EXPIRY = 30000; // 30 seconds for accessible apps

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
 * Make an API request to the Pocket-ID API
 * @param {string} path - API path (without base URL)
 * @param {Object} options - Request options
 * @returns {Promise<any>} - Response data
 */
function makeApiRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
        // Build the full URL
        const url = new URL(`${POCKET_ID_BASE_URL}/api${path}`);

        // Add query parameters if provided
        if (options.params) {
            Object.entries(options.params).forEach(([key, value]) => {
                if (value !== undefined) {
                    url.searchParams.append(key, value);
                }
            });
        }

        const requestOptions = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: `${url.pathname}${url.search}`,
            method: options.method || 'GET',
            headers: {
                'Accept': 'application/json',
                'X-API-KEY': API_KEY,
                ...(options.headers || {})
            },
            // Disable certificate validation in dev only if needed
            rejectUnauthorized: process.env.NODE_ENV === 'production'
        };

        logger.debug(`Making ${requestOptions.method} request to ${url.pathname}${url.search}`);

        const req = https.request(requestOptions, (res) => {
            let data = Buffer.from([]);

            res.on('data', (chunk) => {
                data = Buffer.concat([data, chunk]);
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        // Check if we expect JSON response
                        if (res.headers['content-type']?.includes('application/json')) {
                            resolve(JSON.parse(data.toString()));
                        } else {
                            // For binary data like images
                            resolve(data);
                        }
                    } catch (error) {
                        logger.error('Error parsing API response:', error);
                        reject(new Error(`Failed to parse API response: ${error.message}`));
                    }
                } else {
                    logger.error(`API request failed with status ${res.statusCode}`, {
                        path,
                        statusCode: res.statusCode,
                        statusMessage: res.statusMessage
                    });
                    reject(new Error(`Request failed with status code ${res.statusCode}`));
                }
            });
        });

        req.on('error', (error) => {
            logger.error(`API request error for ${path}:`, error);
            reject(error);
        });

        // Add timeout
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
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
        const response = await makeApiRequest('/oidc/clients', { params });

        // Update cache
        cache.clients = {
            data: response,
            timestamp: Date.now()
        };

        logger.debug(`Retrieved ${response.data.length} clients from API`);
        return response;
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
        const response = await makeApiRequest(`/oidc/clients/${clientId}`);
        return response;
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
        logger.debug('Fetching logo for OIDC client', {clientId});
        // For binary data, we'll get a Buffer back
        return await makeApiRequest(`/oidc/clients/${clientId}/logo`);
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
        logger.error('Error parsing URL:', error, {url});
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
        // Check cache first
        if (cache.userGroups[userId] &&
            cache.userGroups[userId].timestamp > Date.now() - USER_GROUPS_CACHE_EXPIRY) {
            logger.debug(`Using cached groups for user ${userId}`);
            return cache.userGroups[userId].data;
        }

        logger.info('Fetching groups for user', { userId });
        const response = await makeApiRequest(`/users/${userId}/groups`);
        logger.debug(`Retrieved ${response.length} groups for user`, { userId });

        // Cache the result
        cache.userGroups[userId] = {
            data: response,
            timestamp: Date.now()
        };

        return response;
    } catch (error) {
        // If we have cached data and hit an error (like 429), use the cached data
        if (cache.userGroups[userId]) {
            logger.warn(`Error fetching groups for user ${userId}, using cached data:`, error);
            return cache.userGroups[userId].data;
        }

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
    const thisClientId = process.env.OIDC_CLIENT_ID
    try {
        // Generate a cache key based on the user's groups
        const cacheKey = hashArray(userGroups) + (thisClientId ? `_exclude_${thisClientId}` : '');

        // Check cache first
        if (cache.accessibleApps[cacheKey] &&
            cache.accessibleApps[cacheKey].timestamp > Date.now() - ACCESSIBLE_APPS_CACHE_EXPIRY) {
            logger.debug('Using cached accessible apps');
            return cache.accessibleApps[cacheKey].data.filter(client => !client.hiddenInUi);
        }

        // Get all clients
        logger.info('Fetching clients for access check');
        const { data: clients } = await listOIDCClients();

        // Array to store accessible clients with details
        const accessibleClients = [];
        logger.debug(`Processing ${clients.length} clients for access check`);

        // For each client, get details and check if user has access
        for (const client of clients) {
            // Skip the excluded client ID
            if (thisClientId && client.id === thisClientId) {
                logger.debug(`Skipping current app client: ${client.id}`);
                continue;
            }

            try {
                const clientDetails = await getOIDCClient(client.id);
                // Extract group names from allowedUserGroups
                const allowedGroups = clientDetails.allowedUserGroups.map(group => group.name);

                const hasAccess = allowedGroups.some(group => userGroups.includes(group));
                if (hasAccess) {
                    // Extract base URL from the first callback URL
                    const redirectUri = client.callbackURLs && client.callbackURLs.length > 0
                        ? extractBaseUrl(client.callbackURLs[0])
                        : '#';

                    const enrichedMetadata = findClientMetadata(client);

                    accessibleClients.push({
                        id: client.id,
                        name: client.name,
                        hiddenInUi: !!enrichedMetadata?.hidden,
                        description: enrichedMetadata?.description || clientDetails.description || undefined,
                        logo: client.hasLogo ? `${POCKET_ID_BASE_URL}/api/oidc/clients/${client.id}/logo` : null,
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

        accessibleClients.sort((a, b) => a.name.localeCompare(b.name));

        // Cache the results
        cache.accessibleApps[cacheKey] = {
            data: accessibleClients,
            timestamp: Date.now()
        };

        const filtered = accessibleClients.filter(client => !client.hiddenInUi);
        logger.info(`Found accessible clients ${JSON.stringify({ count: filtered.length })}`);
        return filtered;
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
    // Similar caching logic as getAccessibleOIDCClients

    const excludeClientId = process.env.OIDC_CLIENT_ID
    try {
        // Generate a cache key based on the user's groups
        const cacheKey = `all_${hashArray(userGroups)}${excludeClientId ? `_exclude_${excludeClientId}` : ''}`;

        // Check cache first
        if (cache.accessibleApps[cacheKey] &&
            cache.accessibleApps[cacheKey].timestamp > Date.now() - ACCESSIBLE_APPS_CACHE_EXPIRY) {
            logger.debug('Using cached all apps with access info');
            return cache.accessibleApps[cacheKey].data;
        }

        logger.info('Fetching all clients with access information');
        const { data: clients } = await listOIDCClients();

        const allClients = [];
        let accessibleCount = 0;
        logger.debug(`Processing ${clients.length} clients for access information`);

        // For each client, get details and check if user has access
        for (const client of clients) {
            if (excludeClientId && client.id === excludeClientId) {
                logger.debug(`Skipping current app client: ${client.id}`);
                continue;
            }

            try {
                const clientDetails = await getOIDCClient(client.id);
                const allowedGroups = clientDetails.allowedUserGroups.map(group => group.name);
                const hasAccess = allowedGroups.some(group => userGroups.includes(group));
                if (hasAccess) accessibleCount++;

                // Extract base URL from the first callback URL
                const redirectUri = client.callbackURLs && client.callbackURLs.length > 0
                    ? extractBaseUrl(client.callbackURLs[0])
                    : '#';

                const enrichedMetadata = findClientMetadata(client);

                allClients.push({
                    id: client.id,
                    name: client.name,
                    description: enrichedMetadata?.description || clientDetails.description || undefined,
                    logo: client.hasLogo ? `${POCKET_ID_BASE_URL}/api/oidc/clients/${client.id}/logo` : null,
                    redirectUri,
                    allowedGroups,
                    hasAccess
                });
            } catch (error) {
                logger.error(`Error processing client ${client.id}:`, error);
                // Continue with next client
            }
        }

        allClients.sort((a, b) => a.name.localeCompare(b.name));

        // Cache the results
        cache.accessibleApps[cacheKey] = {
            data: allClients,
            timestamp: Date.now()
        };

        logger.info(`Processed total clients ${JSON.stringify({
            total: allClients.length,
            accessible: accessibleCount
        })}`);

        return allClients;
    } catch (error) {
        logger.error('Error getting all OIDC clients with access info:', error);
        throw new Error(`Failed to get all OIDC clients with access info: ${error.message}`);
    }
}

/**
 * Clear the cache
 */
function clearCache() {
    cache.clients = {
        data: null,
        timestamp: null
    };
    cache.userGroups = {};
    cache.accessibleApps = {};
    clearMetadataCache();
    logger.info('Cache cleared');
}
module.exports = {
    listOIDCClients,
    getOIDCClient,
    getOIDCClientLogo,
    getAccessibleOIDCClients,
    getAllOIDCClientsWithAccessInfo,
    getUserGroups,
    clearCache
};