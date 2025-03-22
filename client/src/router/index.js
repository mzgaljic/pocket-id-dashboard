// client/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import { authGuard } from './guards';

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
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Use the auth guard for all routes
router.beforeEach(authGuard);

// Handle redirect after login
router.afterEach((to) => {
  const redirectPath = sessionStorage.getItem('redirectPath');
  if (redirectPath && to.path === '/dashboard') {
    sessionStorage.removeItem('redirectPath');
    router.push(redirectPath);
  }
});

export default router;
