// client/src/services/apps.js
import api from './api';

const API_URL = '/api/apps';
export const appService = {
  async getApps() {
    try {
      console.log('Fetching apps from API...');
      const [appsResponse, requestsResponse] = await Promise.all([
        api.get(API_URL),
        api.get(`${API_URL}/requests`)
      ]);

      console.log('Apps fetched successfully:', appsResponse.data);
      console.log('Requests fetched successfully:', requestsResponse.data);

      // Create a map of appId -> request status
      const requestMap = {};
      requestsResponse.data.forEach(request => {
        requestMap[request.appId] = request;
      });

      // Add request status to apps
      const accessibleApps = appsResponse.data.accessibleApps.map(app => ({
        ...app,
        requested: !!requestMap[app.id],
        requestStatus: requestMap[app.id]?.status || null
      }));

      const allApps = appsResponse.data.allApps.map(app => ({
        ...app,
        requested: !!requestMap[app.id],
        requestStatus: requestMap[app.id]?.status || null
      }));

      return {
        accessibleApps,
        allApps
      };
    } catch (error) {
      console.error('Error fetching apps:', error);
      throw error;
    }
  },

  async requestAccess(appId) {
    try {
      console.log(`Requesting access to app ${appId}...`);
      const response = await api.post(`${API_URL}/request-access`, { appId });
      console.log('Access request submitted:', response.data);

      // Return the updated request data
      return {
        appId,
        requested: true,
        requestStatus: 'pending',
        ...response.data.request
      };
    } catch (error) {
      console.error('Error requesting access:', error);
      throw error;
    }
  }
};
