// client/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import { authGuard } from './guards';
import {authService} from "../services/auth.js";

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/requests',
    name: 'AdminRequests',
    component: () => import('../views/AdminRequests.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Use the auth guard for all routes
router.beforeEach(authGuard);

// Handle redirect after login
router.afterEach(async (to) => {
  // Only handle redirects after successful login
  if (to.path === '/dashboard') {
    const redirectPath = sessionStorage.getItem('redirectPath');
    console.log('Checking redirect path after login:', redirectPath);
    if (redirectPath) {
      console.log('Redirecting to:', redirectPath);
      if (redirectPath.startsWith('/admin/')) {
        try {
          const { user } = await authService.checkAuthStatus();
          if (user && user.isAdmin) {
            sessionStorage.removeItem('redirectPath');
            await router.push(redirectPath);
          } else {
            // If not admin, clear the redirect path
            sessionStorage.removeItem('redirectPath');
          }
        } catch (error) {
          console.error('Error checking admin status for redirect:', error);
          sessionStorage.removeItem('redirectPath');
        }
      } else {
        // For non-admin routes, redirect normally
        sessionStorage.removeItem('redirectPath');
        await router.push(redirectPath);
      }
    }
  }
});

export default router;
