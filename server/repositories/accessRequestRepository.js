// server/repositories/accessRequestRepository.js
const { db } = require('../database');
const logger = require('../utils/logger');

/**
 * Repository for access request operations
 */
class AccessRequestRepository {
    /**
     * Create a new access request
     * @param {Object} requestData - Request data
     * @returns {Promise<Object>} - Created request
     */
    async createRequest(requestData) {
        try {
            const { userId, appId, appName, notes } = requestData;
            logger.debug('Creating access request', { userId, appId });
            // Convert to snake_case for database
            const dbRecord = {
                user_id: userId,
                app_id: appId,
                notes: notes || `Request for ${appName || 'application'}`,
                status: 'pending',
                requested_at: new Date().toISOString()
            };
            // Handle the case where the request already exists
            const existingRequest = await this.getRequestByUserAndApp(userId, appId);
            if (existingRequest) {
                logger.debug('Request already exists, updating', { id: existingRequest.id });
                // Update the existing request
                await db('access_requests')
                    .where('id', existingRequest.id)
                    .update({
                        notes: dbRecord.notes,
                        requested_at: dbRecord.requested_at,
                        status: 'pending' // Reset status if re-requested
                    });
                return this.getRequestById(existingRequest.id);
            }

            // Insert new request
            const result = await db('access_requests')
                .insert(dbRecord)
                .returning('id');

            // Handle different return formats
            let id;
            if (Array.isArray(result) && result.length > 0) {
                // For SQLite or PostgreSQL returning an array
                id = typeof result[0] === 'object' ? result[0].id : result[0];
            } else if (typeof result === 'object' && result.id) {
                // For PostgreSQL potentially returning an object
                id = result.id;
            } else {
                // Fallback - get the last inserted ID
                const lastInsert = await db('access_requests')
                    .where({ user_id: userId, app_id: appId })
                    .orderBy('id', 'desc')
                    .first();
                id = lastInsert.id;
            }

            return this.getRequestById(id);
        } catch (error) {
            logger.error('Error creating access request:', error);
            throw new Error(`Failed to create access request: ${error.message}`);
        }
    }

    /**
     * Get an access request by ID
     * @param {number} id - Request ID
     * @returns {Promise<Object|null>} - Request or null if not found
     */
    async getRequestById(id) {
        try {
            logger.debug('Getting access request by ID', { id });

            const request = await db('access_requests')
                .where('id', id)
                .first();

            if (!request) {
                return null;
            }

            // Convert to camelCase for application
            return {
                id: request.id,
                userId: request.user_id,
                appId: request.app_id,
                requestedAt: request.requested_at,
                status: request.status,
                notes: request.notes
            };
        } catch (error) {
            logger.error('Error getting access request by ID:', error);
            throw new Error(`Failed to get access request: ${error.message}`);
        }
    }

    /**
     * Get all access requests
     * @returns {Promise<Array>} - Array of all requests
     */
    async getAllRequests() {
        try {
            logger.debug('Getting all access requests');
            const requests = await db('access_requests')
                .orderBy([
                    { column: 'requested_at', order: 'desc' }
                ]);

            // Convert to camelCase for application
            return requests.map(request => ({
                id: request.id,
                userId: request.user_id,
                appId: request.app_id,
                requestedAt: request.requested_at,
                status: request.status,
                notes: request.notes
            }));
        } catch (error) {
            logger.error('Error getting all access requests:', error);
            throw new Error(`Failed to get access requests: ${error.message}`);
        }
    }

    /**
     * Get an access request by user ID and app ID
     * @param {string} userId - User ID
     * @param {string} appId - App ID
     * @returns {Promise<Object|null>} - Request or null if not found
     */
    async getRequestByUserAndApp(userId, appId) {
        try {
            logger.debug('Getting access request by user and app', { userId, appId });

            const request = await db('access_requests')
                .where({
                    user_id: userId,
                    app_id: appId
                })
                .first();

            if (!request) {
                return null;
            }

            // Convert to camelCase for application
            return {
                id: request.id,
                userId: request.user_id,
                appId: request.app_id,
                requestedAt: request.requested_at,
                status: request.status,
                notes: request.notes
            };
        } catch (error) {
            logger.error('Error getting access request by user and app:', error);
            throw new Error(`Failed to get access request: ${error.message}`);
        }
    }

    /**
     * Get all access requests for a user
     * @param {string} userId - User ID
     * @returns {Promise<Array>} - Array of requests
     */
    async getRequestsByUser(userId) {
        try {
            logger.debug('Getting access requests by user', { userId });

            const requests = await db('access_requests')
                .where('user_id', userId)
                .orderBy('requested_at', 'desc');

            // Convert to camelCase for application
            return requests.map(request => ({
                id: request.id,
                userId: request.user_id,
                appId: request.app_id,
                requestedAt: request.requested_at,
                status: request.status,
                notes: request.notes
            }));
        } catch (error) {
            logger.error('Error getting access requests by user:', error);
            throw new Error(`Failed to get access requests: ${error.message}`);
        }
    }

    /**
     * Update an access request
     * @param {number} id - Request ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} - Updated request
     */
    async updateRequest(id, updateData) {
        try {
            logger.debug('Updating access request', { id, ...updateData });

            // Convert to snake_case for database
            const dbRecord = {};

            if (updateData.status) dbRecord.status = updateData.status;
            if (updateData.notes) dbRecord.notes = updateData.notes;

            await db('access_requests')
                .where('id', id)
                .update(dbRecord);

            return this.getRequestById(id);
        } catch (error) {
            logger.error('Error updating access request:', error);
            throw new Error(`Failed to update access request: ${error.message}`);
        }
    }

    /**
     * Delete an access request
     * @param {number} id - Request ID
     * @returns {Promise<boolean>} - Success status
     */
    async deleteRequest(id) {
        try {
            logger.debug('Deleting access request', { id });

            const count = await db('access_requests')
                .where('id', id)
                .delete();

            return count > 0;
        } catch (error) {
            logger.error('Error deleting access request:', error);
            throw new Error(`Failed to delete access request: ${error.message}`);
        }
    }
}

module.exports = new AccessRequestRepository();