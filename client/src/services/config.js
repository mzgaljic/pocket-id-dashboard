// client/src/services/config.js
import axios from 'axios';

// Cache for configuration
let configCache = null;

export const configService = {
  // Get the configuration from the server
  async getConfig() {
    if (configCache) {
      return configCache;
    }

    try {
      const response = await axios.get('/api/config');
      configCache = response.data;
      return configCache;
    } catch (error) {
      console.error('Failed to load configuration:', error);
      return {
        pocketIdBaseUrl: ''
      };
    }
  },

  // Get the Pocket ID base URL
  async getPocketIdBaseUrl() {
    const config = await this.getConfig();
    return config.pocketIdBaseUrl || '';
  },

  // Get the Pocket ID account page URL
  async getPocketIdUsersAccountUrl() {
    const baseUrl = await this.getPocketIdBaseUrl();
    return baseUrl ? `${baseUrl}/settings/account` : '#';
  }
};
