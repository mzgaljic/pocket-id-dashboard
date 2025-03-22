// client/src/services/apps.js
import axios from 'axios';

const API_URL = '/api/apps';

export const appService = {
  async getApps() {
    const response = await axios.get(API_URL);
    return response.data;
  },

  async requestAccess(appId) {
    const response = await axios.post(`${API_URL}/request-access`, { appId });
    return response.data;
  }
};
