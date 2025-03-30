// src/main.js
import './assets/main.css';

import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';
import Dashboard from './views/Dashboard.vue';

// Create the router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: Dashboard
    },
    {
      path: '/admin/requests',
      name: 'AdminRequests',
      component: () => import('./views/AdminRequests.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    }
  ]
});

// Create the app
const app = createApp(App);

// Use plugins
app.use(router);
app.use(ui);

// Mount the app
app.mount('#app');
