// client/src/services/apps.js
import axios from 'axios';

const API_URL = '/api/apps';

export const appService = {
  async getApps() {
    try {
      console.log('Fetching apps from API...');
      const response = await axios.get(API_URL);
      console.log('Apps fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching apps:', error);
      throw error;
    }
  },

  async requestAccess(appId) {
    try {
      console.log(`Requesting access to app ${appId}...`);
      const response = await axios.post(`${API_URL}/request-access`, { appId });
      console.log('Access request submitted:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error requesting access:', error);
      throw error;
    }
  }
};
