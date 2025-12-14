<!-- src/App.vue -->
<script setup>
import { ref, onMounted, computed, watch, provide } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from './services/auth';
import { appService } from './services/apps';
import { configService } from './services/config';
import { setFavicon } from './utils/favicon';
import { useTheme } from './composables/useTheme';
import SessionExpiryWarning from './components/SessionExpiryWarning.vue';
import ThemeToggle from './components/ThemeToggle.vue';

const user = ref(null);
const router = useRouter();
const { isDark } = useTheme();
const toast = useToast();
const isLoggingOut = ref(false);
const loading = ref(true);
const authError = ref(null);
const authCheckFailed = ref(false);
const pocketIdUserAccountUrl = ref('#');
const appTitle = ref('');
const ssoProviderName = ref('');
const logoUrl = ref('');
const isClearingCache = ref(false);
const reloadTrigger = ref(0);
const silentFailed = ref(false);
const silentReason = ref(null);

provide('reloadTrigger', reloadTrigger);

const isAdmin = computed(() => {
  return user.value?.isAdmin === true;
});

// watch(user, (newUser) => {
//   if (newUser) {
//     console.log('User loaded:', {
//       name: newUser.name,
//       isAdmin: newUser.isAdmin,
//       groups: newUser.groups
//     });
//   }
// });

function handleLogoError() {
  console.log('Error loading app logo.');
}

onMounted(async () => {
  // Detect silent auth failure signal from callback
  const params = new URLSearchParams(window.location.search);
  if (params.get('silent') === 'failed') {
    silentFailed.value = true;
    silentReason.value = params.get('reason');

    // Clean the URL to avoid re-processing on refresh
    params.delete('silent');
    params.delete('reason');
    const newQuery = params.toString();
    const newUrl = newQuery ? `${window.location.pathname}?${newQuery}` : window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  }

  // Clear auth cache if session expired (helps ensure fresh auth check)
  if (sessionStorage.getItem('sessionExpired') === 'true') {
    authService.clearAuthStatusCache();
  }

  // Check authentication status
  await checkAuth();

  // Load app configuration
  try {
    appTitle.value = await configService.getAppTitle();
    document.title = appTitle.value;
    ssoProviderName.value = await configService.getSsoProviderName();
    pocketIdUserAccountUrl.value = await configService.getPocketIdUsersAccountUrl();

    const dynamicLogoUrl = await configService.getLogoUrl(isDark.value);
    if (dynamicLogoUrl) {
      logoUrl.value = dynamicLogoUrl;
    }
    const faviconUrl = await configService.getFaviconUrl();
    if (faviconUrl) {
      setFavicon(faviconUrl);
    }
  } catch (error) {
    console.error('Failed to load app configuration:', error);
  }
});

async function checkAuth() {
  try {
    console.log('Checking authentication status...');
    loading.value = true;
    authError.value = null;
    authCheckFailed.value = false;
    const { authenticated, user: userData, oidcInitialized } = await authService.checkAuthStatus();
    console.log('Auth status:', { authenticated, oidcInitialized });
    if (authenticated) {
      user.value = userData;
      console.log('User is authenticated:', userData);
      sessionStorage.removeItem('silentLoginAttempted');
      sessionStorage.removeItem('suppressSilentLogin');

      // Check for redirect after login
      const redirectPath = sessionStorage.getItem('redirectPath');
      if (redirectPath) {
        // For admin routes, verify admin status
        if (redirectPath.startsWith('/admin/')) {
          if (userData.isAdmin) {
            sessionStorage.removeItem('redirectPath');
            await router.push(redirectPath);
          } else {
            // Clear redirect if not admin
            sessionStorage.removeItem('redirectPath');
          }
        } else {
          // For non-admin routes, redirect normally
          sessionStorage.removeItem('redirectPath');
          await router.push(redirectPath);
        }
      }
    } else {
      console.log('User is not authenticated');
      user.value = null;

      // Attempt silent login once (works even when landing directly on '/')
      const silentAttempted = sessionStorage.getItem('silentLoginAttempted') === 'true';
      const suppressSilent = sessionStorage.getItem('suppressSilentLogin') === 'true';
      if (!silentFailed.value && !silentAttempted && oidcInitialized && !suppressSilent) {
        sessionStorage.setItem('silentLoginAttempted', 'true');
        await authService.silentLogin();
        return;
      }

      // If we're on a protected route, redirect to home
      if (router.currentRoute.value.path !== '/' &&
        router.currentRoute.value.meta?.requiresAuth) {
        await router.push('/');
      }
    }
    if (!oidcInitialized) {
      authError.value = 'OIDC service is not initialized. Please try again later.';
    }
  } catch (error) {
    console.error('Auth check failed', error);
    authError.value = 'Failed to check authentication status';
    authCheckFailed.value = true;
    user.value = null;

    // Show a toast notification
    toast.add({
      title: 'Authentication Error',
      description: 'There was a problem checking your authentication status. Please try refreshing the page.',
      icon: 'i-heroicons-exclamation-circle',
      color: 'error',
      timeout: 5000
    });

    // If we're on a protected route, redirect to home
    if (router.currentRoute.value.path !== '/' &&
      router.currentRoute.value.meta?.requiresAuth) {
      await router.push('/');
    }
  } finally {
    loading.value = false;
  }
}

function retryAuthCheck() {
  checkAuth();
}

// Watch for changes to isDark to update the logo
watch(isDark, async (newValue) => {
  try {
    const dynamicLogoUrl = await configService.getLogoUrl(newValue);
    if (dynamicLogoUrl) {
      logoUrl.value = dynamicLogoUrl;
    }
  } catch (error) {
    console.error('Failed to update logo:', error);
  }
});

async function clearServerCache() {
  if (!isAdmin.value) return;

  try {
    isClearingCache.value = true;
    await appService.clearCache();

    // trigger components to refresh (re-fetch from api)
    reloadTrigger.value++;

    toast.add({
      title: 'Cache Cleared',
      description: 'Server cache has been cleared successfully. Refreshing data...',
      icon: 'i-heroicons-check-circle',
      color: 'success',
      timeout: 5000
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    toast.add({
      title: 'Error',
      description: 'Failed to clear server cache. Please try again.',
      icon: 'i-heroicons-exclamation-circle',
      color: 'error',
      timeout: 5000
    });
  } finally {
    isClearingCache.value = false;
  }
}

const userMenuItems = computed(() => {
  const items = [
    [
      {
        label: 'Profile',
        icon: 'i-heroicons-user-circle',
        onSelect: () => window.open(pocketIdUserAccountUrl.value, '_blank')
      },
    ],
    [
      {
        label: isLoggingOut.value ? 'Logging out...' : 'Sign Out',
        icon: isLoggingOut.value ? 'i-heroicons-arrow-path' : 'i-heroicons-arrow-right-on-rectangle',
        disabled: isLoggingOut.value,
        onSelect: () => logout(),
      }
    ],
  ];

  // admin-only features
  if (isAdmin.value) {
    // Insert before the last group (sign out)
    items.splice(1, 0, [
      {
        label: 'Manage Requests',
        icon: 'i-heroicons-key',
        onSelect: () => router.push('/admin/requests')
      },
      {
        label: isClearingCache.value ? 'Clearing Cache...' : 'Clear Server Cache',
        icon: isClearingCache.value ? 'i-heroicons-arrow-path' : 'i-heroicons-trash',
        disabled: isClearingCache.value,
        onSelect: () => clearServerCache(),
      }
    ]);
  }

  return items;
});

const getUserInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

const login = () => {
  console.log('Initiating login...');
  sessionStorage.removeItem('silentLoginAttempted');
  sessionStorage.removeItem('suppressSilentLogin');
  authService.login();
};

const logout = async () => {
  try {
    isLoggingOut.value = true;
    sessionStorage.setItem('suppressSilentLogin', 'true');
    await authService.logout();
  } catch (error) {
    console.error('Logout failed', error);
    toast.add({
      title: 'Logout Failed',
      description: 'There was a problem logging you out. Please try again.',
      icon: 'i-heroicons-x-circle',
      color: 'error',
      timeout: 5000
    });
    isLoggingOut.value = false;
  }
};
</script>

<template>
  <UApp>
    <UContainer class="py-8">
      <header v-if="user || loading" class="flex justify-between items-center mb-8 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center">
          <AppLogoImage
            :src="logoUrl"
            :alt="appTitle"
            size="lg"
            :isDark="isDark"
            class="mr-4"
          />
          <h1 class="text-xl font-bold">{{ appTitle }}</h1>
        </div>
        <div class="flex items-center">
          <ThemeToggle class="mr-4" />
          <UDropdownMenu
            v-if="user"
            :items="userMenuItems">
            <UButton color="gray" variant="ghost" :disabled="isLoggingOut">
              <template #leading>
                <UAvatar
                  :src="user.picture"
                  :text="getUserInitials(user.name)"
                  size="sm"
                />
              </template>
              {{ user.name }}
              <template #trailing>
                <UIcon v-if="!isLoggingOut" name="i-heroicons-chevron-down" />
                <UProgress v-else size="xs" animation="carousel" class="w-4 h-4" />
              </template>
            </UButton>
          </UDropdownMenu>
          <div v-else-if="loading" class="h-10 w-10 flex items-center justify-center">
            <UProgress size="xs" animation="carousel" class="w-5 h-5" />
          </div>
        </div>
      </header>

      <main>
        <!-- Show loading indicator -->
        <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
          <div class="text-center">
            <UIcon name="i-heroicons-arrow-path" class="text-gray-400 dark:text-gray-600 w-12 h-12 animate-spin mb-4" />
            <p class="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        </div>

        <!-- Show auth error if any -->
        <div v-else-if="authError || authCheckFailed" class="flex items-center justify-center min-h-[60vh]">
          <UCard class="max-w-md">
            <template #header>
              <div class="flex items-center text-red-500">
                <UIcon name="i-heroicons-exclamation-circle" class="mr-2" />
                <h3 class="text-lg font-medium">Authentication Error</h3>
              </div>
            </template>
            <p>{{ authError || 'There was a problem with authentication. Please try again.' }}</p>
            <template #footer>
              <div class="flex">
                <UButton @click="retryAuthCheck" color="gray" variant="soft">Retry</UButton>
              </div>
            </template>
          </UCard>
        </div>

        <!-- Show login screen if not authenticated -->
        <div v-else-if="!user" class="flex items-center justify-center min-h-[70vh] px-4">
          <UCard class="max-w-md w-full shadow-lg ring-1 ring-gray-200/70 dark:ring-gray-800">
            <template #header>
              <div class="flex flex-col items-center px-6 pt-8 pb-6">
                <AppLogoImage
                  :src="logoUrl"
                  :alt="appTitle"
                  size="xl"
                  :isDark="isDark"
                  class="mb-4"
                  @error="handleLogoError"
                />
                <h2 class="text-xl font-bold text-center">Welcome to {{ appTitle }}</h2>
              </div>
            </template>
            <template #footer>
              <div class="px-6 pb-6 pt-2 flex flex-col items-center">
                <div
                  v-if="silentFailed"
                  class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4"
                >
                  <p class="text-blue-800 dark:text-blue-200 text-sm">
                    <strong>Single sign-on couldn’t continue automatically.</strong>
                    Please click the button below to sign in.
                    <span v-if="silentReason" class="block text-xs mt-1 text-blue-700 dark:text-blue-200">
                      Reason: {{ silentReason }}
                    </span>
                  </p>
                </div>
                <UButton
                  color="primary"
                  variant="solid"
                  size="xl"
                  icon="i-heroicons-arrow-right-on-rectangle"
                  class="h-12 text-base font-semibold shadow-sm hover:shadow-md w-full sm:w-auto px-8"
                  @click="login"
                >
                  Sign In with {{ ssoProviderName }}
                </UButton>
              </div>
            </template>
          </UCard>
        </div>

        <!-- Show router view if authenticated -->
        <router-view v-else />
      </main>
      <footer class="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400">
      </footer>
    </UContainer>
    <SessionExpiryWarning v-if="user" />
  </UApp>
</template>
