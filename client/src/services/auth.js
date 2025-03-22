// src/services/auth.js
import axios from 'axios';

const API_URL = '/auth';

export const authService = {
  async getCurrentUser() {
    try {
      const response = await axios.get(`${API_URL}/user`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  async logout() {
    try {
      // In a real implementation, this would call your backend
      // For now, we'll just simulate a successful logout
      localStorage.removeItem('user-session');

      // For demo purposes, we'll redirect to the login page after a short delay
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 500);
      });
    } catch (error) {
      console.error('Logout failed', error);
      throw error;
    }
  }
};
