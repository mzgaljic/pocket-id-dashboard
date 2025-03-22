// src/router/guards.js
import { authService } from '../services/auth';

export async function authGuard(to, from, next) {
  const { authenticated } = await authService.checkAuthStatus();

  if (to.meta.requiresAuth && !authenticated) {
    // Save the intended destination for redirection after login
    sessionStorage.setItem('redirectPath', to.fullPath);
    return next('/');
  }

  if (to.meta.guestOnly && authenticated) {
    return next('/dashboard');
  }

  next();
}
