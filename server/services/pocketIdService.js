// server/services/pocketIdService.js
const axios = require('axios');

// Base URL for the Pocket-ID API
const API_BASE_URL = process.env.POCKET_ID_API_URL;
const API_KEY = process.env.POCKET_ID_API_KEY;

// Create an axios instance with default headers
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Accept': 'application/json',
        'X-API-KEY': API_KEY
    }
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
            console.log('Using cached clients list');
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

        console.log('Fetching fresh clients list from API');
        const response = await apiClient.get('/oidc/clients', { params });

        // Update cache
        cache.clients = {
            data: response.data,
            timestamp: Date.now()
        };

        return response.data;
    } catch (error) {
        console.error('Error fetching OIDC clients:', error.message);
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
        const response = await apiClient.get(`/oidc/clients/${clientId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching OIDC client ${clientId}:`, error.message);
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
        const response = await apiClient.get(`/oidc/clients/${clientId}/logo`, {
            responseType: 'arraybuffer'
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching logo for OIDC client ${clientId}:`, error.message);
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
        console.error('Error parsing URL:', error);
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
        console.log(`Fetching groups for user ${userId} from API`);
        const response = await apiClient.get(`/users/${userId}/groups`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching groups for user ${userId}:`, error.message);
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
        const { data: clients } = await listOIDCClients();

        // Array to store accessible clients with details
        const accessibleClients = [];

        // For each client, get details and check if user has access
        for (const client of clients) {
            try {
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
                console.error(`Error processing client ${client.id}:`, error.message);
                // Continue with next client
            }
        }

        return accessibleClients;
    } catch (error) {
        console.error('Error getting accessible OIDC clients:', error.message);
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
        const { data: clients } = await listOIDCClients();

        // Array to store all clients with access information
        const allClients = [];

        // For each client, get details and check if user has access
        for (const client of clients) {
            try {
                const clientDetails = await getOIDCClient(client.id);

                // Extract group names from allowedUserGroups
                const allowedGroups = clientDetails.allowedUserGroups.map(group => group.name);

                // Check if user is in any of the allowed groups
                const hasAccess = allowedGroups.some(group => userGroups.includes(group));

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
                console.error(`Error processing client ${client.id}:`, error.message);
                // Continue with next client
            }
        }

        return allClients;
    } catch (error) {
        console.error('Error getting all OIDC clients with access info:', error.message);
        throw new Error(`Failed to get all OIDC clients with access info: ${error.message}`);
    }
}

// Add a function to clear the cache
function clearCache() {
    cache.clients = {
        data: null,
        timestamp: null
    };
    console.log('Cache cleared');
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