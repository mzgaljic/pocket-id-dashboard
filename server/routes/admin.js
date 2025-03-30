// server/routes/admin.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const accessRequestRepository = require('../repositories/accessRequestRepository');
const pocketIdService = require('../services/pocketIdService');
const logger = require('../utils/logger');

// Admin middleware to check if user is an admin
const adminAuth = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        logger.warn('Non-admin user attempted to access admin route', {
            userId: req.user?.id,
            path: req.path
        });
        return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have permission to access this resource'
        });
    }
    next();
};

// Get all pending access requests
router.get('/access-requests', auth, adminAuth, async (req, res) => {
    try {
        logger.info('Admin fetching all access requests');
        const requests = await accessRequestRepository.getAllRequests();

        // Enrich the requests with user and app details
        const enrichedRequests = [];
        for (const request of requests) {
            try {
                // Get app details
                const appDetails = await pocketIdService.getOIDCClient(request.appId);

                // Get user details
                let userDetails = null;
                try {
                    userDetails = await pocketIdService.getUserDetails(request.userId);
                    logger.debug(`Retrieved user details for ${request.userId}`, {
                        name: userDetails.name,
                        email: userDetails.email
                    });
                } catch (userError) {
                    logger.warn(`Could not fetch user details for ${request.userId}`, { error: userError.message });
                    // Continue without user details
                }

                // Create enriched request object
                const pocketIdBaseUrl = process.env.POCKET_ID_BASE_URL;
                const enrichedRequest = {
                    ...request,
                    app: {
                        name: appDetails.name || 'Unknown App',
                        allowedUserGroups: appDetails.allowedUserGroups || []
                    },
                    user: userDetails ? {
                        id: request.userId,
                        name: userDetails.firstName ? `${userDetails.firstName} ${userDetails.lastName}` : 'Unknown User',
                        email: userDetails.email || 'No Email',
                        picture: `${pocketIdBaseUrl}/api/users/${request.userId}/profile-picture.png`
                    } : {
                        id: request.userId,
                        name: 'Unknown User',
                        email: 'No Email'
                    }
                };

                enrichedRequests.push(enrichedRequest);
            } catch (error) {
                logger.error(`Error enriching request ${request.id}:`, error);
                // Still include the request even if enrichment fails
                enrichedRequests.push(request);
            }
        }

        res.json(enrichedRequests);
    } catch (error) {
        logger.error('Error fetching access requests:', error);
        res.status(500).json({
            error: 'Failed to fetch access requests',
            message: error.message
        });
    }
});

// Update access request status
router.put('/access-requests/:id', auth, adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, groupIds, notes } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                error: 'Invalid status',
                message: 'Status must be either "approved" or "rejected"'
            });
        }

        logger.info(`Admin updating access request ${id} to ${status}`, {
            adminId: req.user.id,
            adminName: req.user.name,
            requestId: id,
            status,
            groupIds
        });

        // Get the request to verify it exists
        const request = await accessRequestRepository.getRequestById(id);
        if (!request) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Access request not found'
            });
        }

        // Prepare notes and track if group assignment succeeded
        let groupAssignmentSuccess = true;
        let updatedNotes = notes || `${status.charAt(0).toUpperCase() + status.slice(1)} by admin ${req.user.name} (${req.user.id})`;

        // If approved, add user to the specified groups
        let groupUpdateResult = null;
        if (status === 'approved' && groupIds && groupIds.length > 0) {
            try {
                // Extract just the group IDs if we received objects
                const groupIdsToAdd = groupIds.map(group =>
                    typeof group === 'object' && group.value ? group.value : group
                );

                logger.info(`Adding user ${request.userId} to groups:`, { groupIdsToAdd });
                groupUpdateResult = await pocketIdService.updateUserGroups(request.userId, groupIdsToAdd);

                // Add information about the groups to the notes
                const groupNote = `Added user to the following groups: ${groupIdsToAdd.join(', ')}`;
                updatedNotes = `${updatedNotes}\n${groupNote}`;

            } catch (groupError) {
                groupAssignmentSuccess = false;
                logger.error('Error adding user to groups:', groupError);

                // Add error information to the notes
                const errorNote = `Failed to add user to groups: ${groupError.message}`;
                updatedNotes = `${updatedNotes}\n${errorNote}`;
            }
        }

        // Update the request status
        const updatedRequest = await accessRequestRepository.updateRequest(id, {
            status,
            notes: updatedNotes
        });

        // Return appropriate response based on success
        if (status === 'approved' && !groupAssignmentSuccess) {
            return res.status(207).json({  // 207 Multi-Status - partial success
                request: updatedRequest,
                warning: 'Request was approved but group assignment failed',
                groupUpdateError: 'Failed to add user to the specified groups'
            });
        }

        res.json({
            request: updatedRequest,
            groupUpdateResult: groupUpdateResult,
            success: true
        });
    } catch (error) {
        logger.error('Error updating access request:', error);
        res.status(500).json({
            error: 'Failed to update access request',
            message: error.message
        });
    }
});


module.exports = router;