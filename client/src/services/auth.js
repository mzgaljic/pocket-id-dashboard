// src/services/auth.js
import axios from 'axios';

const API_URL = '/auth';

// Add a cache for auth status (temp fix)
let authStatusCache = null;
let authStatusCacheTime = 0;
const CACHE_DURATION = 2000; // 2 seconds

export const authService = {
  async getCurrentUser() {
    try {
      console.log('Getting current user...');
      const response = await axios.get(`${API_URL}/user`);
      console.log('Current user:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  // TODO: use store like Pinia to handle redundant auth checks (session expiry code, Home.vue, router guard)
  // the cache here is a temporary hack
  async checkAuthStatus() {
    const now = Date.now();
    if (authStatusCache && now - authStatusCacheTime < CACHE_DURATION) {
      //console.log('Using cached auth status');
      return authStatusCache;
    }

    try {
      console.log('Checking auth status...');
      const response = await axios.get(`${API_URL}/status`);
      console.log('Auth status response:', response.data);

      authStatusCache = response.data;
      authStatusCacheTime = now;

      return response.data;
    } catch (error) {
      console.error('Error checking auth status:', error);
      return {
        authenticated: false,
        user: null,
        oidcInitialized: false,
        tokenStatus: null
      };
    }
  },

  clearAuthStatusCache() {
    authStatusCache = null;
    authStatusCacheTime = 0;
  },

  async silentLogin() {
    console.log('Initiating silent login (prompt=none)...');
    this.clearAuthStatusCache();
    // Use direct navigation to ensure session cookie is properly set before redirect
    window.location.href = `${API_URL}/login?prompt=none`;
  },

  async login() {
    console.log('Initiating login...');
    this.clearAuthStatusCache();
    // Use direct navigation to /auth/login instead of two-step XHR approach
    // This ensures the session cookie is properly set before the redirect to the OIDC provider
    // (avoids race condition where browser navigates before processing Set-Cookie header)
    window.location.href = `${API_URL}/login`;
  },

  async logout() {
    try {
      console.log('Logging out...');
      this.clearAuthStatusCache();
      // Using window.location.href to ensure a full page reload
      window.location.href = `${API_URL}/logout`;
      return { success: true };
    } catch (error) {
      console.error('Logout failed', error);
      throw error;
    }
  },
};
