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
        pocketIdBaseUrl: '',
        appTitle: 'Pocket ID Dashboard',
        logoLight: null,
        logoDark: null,
        favicon: null
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
  },

  // Get the app title
  async getAppTitle() {
    const config = await this.getConfig();
    return config.appTitle || 'Pocket ID Dashboard';
  },

  // Get the app title
  async getSsoProviderName() {
    const config = await this.getConfig();
    return config.ssoProviderName || 'Pocket ID';
  },

  // Get the appropriate logo URL based on theme
  async getLogoUrl(isDark = false) {
    const config = await this.getConfig();
    return `/api/proxy/logo?light=${!isDark}`;
  },

  // Get the favicon URL
  async getFaviconUrl() {
    return '/api/proxy/favicon';
  }
};
