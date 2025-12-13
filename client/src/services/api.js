// client/src/services/api.js
import axios from 'axios';

const api = axios.create();

/**
 * Clear session cookie by setting it to expire
 * This helps ensure a clean state when sessions become invalid
 */
function clearSessionCookie() {
  // Default cookie name from server (matches server/index.js)
  const cookieName = 'pocket_id_session';
  
  // Clear cookie for current path and root path
  const paths = ['/', window.location.pathname];
  paths.forEach(path => {
    // Set cookie to expire in the past
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
    // Also try with SameSite and Secure attributes
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; SameSite=Lax`;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; SameSite=Lax; Secure`;
  });
}

api.interceptors.response.use(
  response => response,
  error => {
    // Check if error is due to unauthorized access (expired/invalid session)
    if (error.response && error.response.status === 401) {
      // Check for specific error codes
      const errorCode = error.response.data?.code;

      // Handle all authentication-related error codes
      const authErrorCodes = [
        'token_expired',
        'invalid_token',
        'invalid_session',
        'not_authenticated'
      ];

      if (authErrorCodes.includes(errorCode)) {
        // Store a message in sessionStorage to show after redirect
        const shouldRedirect = window.location.pathname !== '/';
        if (shouldRedirect) {
          sessionStorage.setItem('sessionExpired', 'true');
        }

        // Clear the session cookie to ensure clean state
        clearSessionCookie();

        // Use window.location for redirect to ensure full page reload
        // This clears any stale Vue state and ensures a fresh start
        if (shouldRedirect) {
          window.location.href = '/';
        }

        // Return a rejected promise with a specific error
        return Promise.reject({
          ...error,
          __handled: true, // Mark as handled by interceptor
          __redirected: true,
          __authError: true // Mark as auth error for component handling
        });
      }
    }

    // For other errors, just pass through
    return Promise.reject(error);
  }
);

export default api;
