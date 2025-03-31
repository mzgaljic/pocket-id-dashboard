import { authService } from '../services/auth';

export async function authGuard(to, from, next) {
  try {
    const { authenticated, user } = await authService.checkAuthStatus();

    // If route requires auth and user is not authenticated
    if (to.meta.requiresAuth && !authenticated) {
      // Save the intended destination for redirection after login
      sessionStorage.setItem('redirectPath', to.fullPath);
      return next('/');
    }

    // If route requires admin and user is not an admin
    if (to.meta.requiresAdmin && (!user || !user.isAdmin)) {
      // If user is authenticated but not admin, redirect to dashboard
      if (authenticated) {
        return next('/dashboard');
      }

      // If not authenticated, save the intended destination for redirection after login
      sessionStorage.setItem('redirectPath', to.fullPath);
      return next('/');
    }

    // If route is for guests only and user is authenticated
    if (to.meta.guestOnly && authenticated) {
      return next('/dashboard');
    }

    next();
  } catch (error) {
    console.error('Auth check failed:', error);

    // If error checking auth status, and route requires auth, redirect to home page to be safe
    if (to.meta.requiresAuth) {
      return next('/');
    }
    next();
  }
}
