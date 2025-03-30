// client/src/services/api.js
import axios from 'axios';
import { useRouter } from 'vue-router';

const api = axios.create();

api.interceptors.response.use(
  response => response,
  error => {
    // Check if error is due to unauthorized access (expired token)
    if (error.response && error.response.status === 401) {
      const router = useRouter();

      // Check for specific error codes
      const errorCode = error.response.data?.code;

      if (errorCode === 'token_expired' || errorCode === 'invalid_token') {
        // Show a user-friendly message
        const toast = useToast();
        toast.add({
          title: 'Session Expired',
          description: 'Your session has expired. Please sign in again.',
          icon: 'i-heroicons-exclamation-circle',
          color: 'warning',
          timeout: 5000
        });

        // Redirect to login page
        router.push('/');

        // Return a rejected promise with a specific error
        return Promise.reject({
          ...error,
          __handled: true, // Mark as handled by interceptor
          __redirected: true
        });
      }
    }

    // For other errors, just pass through
    return Promise.reject(error);
  }
);

export default api;
