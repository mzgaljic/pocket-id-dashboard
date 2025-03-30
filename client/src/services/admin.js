// client/src/services/admin.js
import api from './api';

const API_URL = '/api/admin';

export const adminService = {
  async getAccessRequests() {
    try {
      console.log('Fetching access requests...');
      const response = await api.get(`${API_URL}/access-requests`);
      console.log('Access requests fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching access requests:', error);
      throw error;
    }
  },

  async updateAccessRequest(id, data) {
    try {
      console.log(`Updating access request ${id}...`, data);
      const response = await api.put(`${API_URL}/access-requests/${id}`, data);

      // Check for partial success (207 status code)
      if (response.status === 207) {
        console.warn('Partial success updating request:', response.data);
        return {
          ...response.data,
          partialSuccess: true,
          warning: response.data.warning || 'Request was approved but some operations failed'
        };
      }

      console.log('Access request updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating access request:', error);
      throw error;
    }
  }
};
