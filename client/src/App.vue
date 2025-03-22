<!-- src/App.vue -->
<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from './services/auth';

const user = ref(null);
const router = useRouter();
const isDark = ref(false);
const toast = useToast();
const isLoggingOut = ref(false);
const loading = ref(true);
const authError = ref(null);

// Initialize dark mode from localStorage or system preference
onMounted(() => {
  // Check localStorage first
  const savedTheme = localStorage.getItem('color-theme');
  if (savedTheme) {
    isDark.value = savedTheme === 'dark';
  } else {
    // Check system preference
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  // Apply initial theme
  applyTheme();
  // react to system preference change
  const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  darkModeMediaQuery.addEventListener('change', (e) => {
    // Only update if the user hasn't explicitly set a preference
    if (!localStorage.getItem('color-theme')) {
      isDark.value = e.matches;
    }
  });

  // Check authentication status
  checkAuth();
});

async function checkAuth() {
  try {
    console.log('Checking authentication status...');
    const { authenticated, user: userData, oidcInitialized } = await authService.checkAuthStatus();
    console.log('Auth status:', { authenticated, oidcInitialized });

    if (authenticated) {
      user.value = userData;
      console.log('User is authenticated:', userData);
    } else {
      console.log('User is not authenticated, redirecting to home');
      // If we're not on the home page, redirect to home
      if (router.currentRoute.value.path !== '/') {
        router.push('/');
      }
    }

    if (!oidcInitialized) {
      authError.value = 'OIDC service is not initialized. Please try again later.';
    }
  } catch (error) {
    console.error('Auth check failed', error);
    authError.value = 'Failed to check authentication status';
  } finally {
    loading.value = false;
  }
}

// Watch for changes to isDark
watch(isDark, () => {
  applyTheme();
});

// Apply theme based on isDark value
const applyTheme = () => {
  if (isDark.value) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('color-theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('color-theme', 'light');
  }
};

// Toggle between light and dark mode
const toggleDarkMode = () => {
  isDark.value = !isDark.value;
};

const userMenuItems = computed(() => [
  [
    {
      label: 'Profile',
      icon: 'i-heroicons-user-circle',
      onSelect: () => router.push('/profile')
    },
    {
      label: 'Settings',
      icon: 'i-heroicons-cog-6-tooth',
      onSelect: () => router.push('/settings')
    }
  ],
  [
    {
      label: isLoggingOut.value ? 'Logging out...' : 'Sign Out',
      icon: isLoggingOut.value ? 'i-heroicons-arrow-path' : 'i-heroicons-arrow-right-on-rectangle',
      disabled: isLoggingOut.value,
      onSelect: () => logout(),
    }
  ]
]);

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
  authService.login();
};

const logout = async () => {
  try {
    isLoggingOut.value = true;
    await authService.logout();
  } catch (error) {
    console.error('Logout failed', error);
    toast.add({
      title: 'Logout Failed',
      description: 'There was a problem logging you out. Please try again.',
      icon: 'i-heroicons-x-circle',
      color: 'red',
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
          <UAvatar
            src="/logo.svg"
            alt="Pocket-ID"
            size="lg"
            class="mr-4"
          />
          <h1 class="text-xl font-bold">Pocket-ID Dashboard</h1>
        </div>
        <div class="flex items-center">
          <UButton
            color="gray"
            variant="ghost"
            :icon="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'"
            class="mr-4"
            @click="toggleDarkMode"
          />
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
        <div v-else-if="authError" class="flex items-center justify-center min-h-[60vh]">
          <UCard class="max-w-md">
            <template #header>
              <div class="flex items-center text-red-500">
                <UIcon name="i-heroicons-exclamation-circle" class="mr-2" />
                <h3 class="text-lg font-medium">Authentication Error</h3>
              </div>
            </template>
            <p>{{ authError }}</p>
            <template #footer>
              <UButton @click="checkAuth" color="primary">Retry</UButton>
            </template>
          </UCard>
        </div>

        <!-- Show login screen if not authenticated -->
        <div v-else-if="!user" class="flex items-center justify-center min-h-[60vh]">
          <UCard class="max-w-md w-full">
            <template #header>
              <div class="flex flex-col items-center py-4">
                <UAvatar
                  src="/logo.svg"
                  alt="Pocket-ID"
                  size="xl"
                  class="mb-4"
                />
                <h2 class="text-xl font-bold">Welcome to Pocket-ID</h2>
              </div>
            </template>
            <p class="text-center text-gray-500 dark:text-gray-400 mb-6">
              Sign in to access your application dashboard. All your authorized
              applications will be available in one convenient location.
            </p>
            <template #footer>
              <UButton
                block
                color="primary"
                size="lg"
                icon="i-heroicons-arrow-right-circle"
                @click="login"
              >
                Sign In with Pocket-ID
              </UButton>
            </template>
          </UCard>
        </div>

        <!-- Show router view if authenticated -->
        <router-view v-else />
      </main>
      <footer class="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400">
        <p>&copy; {{ new Date().getFullYear() }} Pocket-ID Dashboard. All rights reserved.</p>
      </footer>
    </UContainer>
  </UApp>
</template>
