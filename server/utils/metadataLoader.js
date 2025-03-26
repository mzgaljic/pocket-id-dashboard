// server/utils/metadataLoader.js
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const logger = require('./logger');

let metadataCache = null;

/**
 * Loads OIDC client metadata from a YAML file
 * @returns {Object|null} Parsed metadata or null if file doesn't exist or is invalid
 */
function loadOidcClientMetadata() {
    if (metadataCache) {
        return metadataCache;
    }

    const metadataFilePath = process.env.OIDC_CLIENTS_METADATA_FILE;
    if (!metadataFilePath) {
        logger.debug('No OIDC clients metadata file specified');
        return null;
    }

    try {
        const resolvedPath = path.resolve(process.cwd(), metadataFilePath);

        if (!fs.existsSync(resolvedPath)) {
            logger.warn(`OIDC clients metadata file not found: ${resolvedPath}`);
            return null;
        }

        // Read and parse the YAML file
        const fileContents = fs.readFileSync(resolvedPath, 'utf8');
        const metadata = yaml.load(fileContents);

        logger.info(`Loaded OIDC clients metadata from ${resolvedPath}`);
        logger.debug(`Found metadata for ${Object.keys(metadata?.oidcClients || {}).length} clients`);

        metadataCache = metadata;
        return metadata;
    } catch (error) {
        logger.error('Error loading OIDC clients metadata:', error);
        return null;
    }
}

/**
 * Finds enriched metadata for a specific client
 * @param {Object} client - The client object to enrich
 * @returns {Object|null} - Enriched metadata or null if not found
 */
function findClientMetadata(client) {
    const metadata = loadOidcClientMetadata();

    if (!metadata || !metadata.oidcClients) {
        return null;
    }

    // Iterate through all defined clients in the metadata file
    for (const [key, clientMetadata] of Object.entries(metadata.oidcClients)) {
        if (!clientMetadata.filter) continue;

        const { field, value } = clientMetadata.filter;

        if (!field || !value) continue;

        const clientValue = client[field];

        if (clientValue === undefined || clientValue === null) continue;

        let caseSensitive;
        if (clientMetadata.filter.caseSensitive !== undefined) {
            // Explicit setting takes precedence
            caseSensitive = clientMetadata.filter.caseSensitive;
        } else {
            // Default based on field
            caseSensitive = (field === 'id');
        }

        let isMatch = false;
        if (caseSensitive) {
            isMatch = String(clientValue).trim() === String(value).trim();
        } else {
            isMatch = String(clientValue).trim().toLowerCase() === String(value).trim().toLowerCase();
        }

        if (isMatch) {
            logger.debug(`Found metadata match for client ${client.name} (${client.id}) using key ${key}, field ${field} (caseSensitive: ${caseSensitive})`);
            return clientMetadata;
        }
    }

    return null;
}

/**
 * Clear the metadata cache
 */
function clearMetadataCache() {
    metadataCache = null;
    logger.debug('Cleared OIDC clients metadata cache');
}

module.exports = {
    loadOidcClientMetadata,
    findClientMetadata,
    clearMetadataCache
};