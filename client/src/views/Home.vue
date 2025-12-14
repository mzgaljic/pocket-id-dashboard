<!-- src/views/Home.vue -->
<template>
  <div class="flex items-center justify-center min-h-[60vh]">
    <UCard class="max-w-md w-full">
      <template #header>
        <div class="flex flex-col items-center py-4">
          <AppLogoImage
            :src="logoUrl"
            :alt="appTitle"
            size="xl"
            :isDark="isDark"
            class="mb-4"
            @error="handleLogoError"
          />
          <h2 class="text-xl font-bold">Welcome to {{ appTitle }}</h2>
        </div>
      </template>
      <p class="text-center text-gray-500 dark:text-gray-300 mb-6 mt-6">
        Sign in to access your application dashboard.
      </p>
      <div v-if="sessionExpired" class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
        <p class="text-amber-700 dark:text-amber-400 text-sm">
          <strong>Session Expired:</strong> Your previous session is no longer valid. Please sign in again.
        </p>
      </div>
      <div v-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
        <p class="text-red-700 dark:text-red-400 text-sm">
          <strong>Error:</strong> {{ error }}
        </p>
      </div>
      <div v-if="silentFailed" class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <p class="text-blue-700 dark:text-blue-300 text-sm">
          <strong>Single sign-on not available:</strong>
          Please click "Sign In" to continue.
          <span v-if="silentReason" class="block text-xs mt-1 text-blue-600 dark:text-blue-200">Reason: {{ silentReason }}</span>
        </p>
      </div>
      <template #footer>
        <UButton
          block
          color="primary"
          size="xl"
          icon="i-heroicons-arrow-right-circle"
          @click="login"
          :loading="isLoading"
          :disabled="isLoading || !oidcInitialized"
        >
          Sign In with {{ ssoProviderName }}
        </UButton>
        <p v-if="!oidcInitialized" class="text-center text-amber-600 dark:text-amber-400 text-sm mt-4">
          OIDC service is initializing. Please wait a moment...
        </p>
      </template>
    </UCard>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { authService } from '../services/auth';
import {configService} from "../services/config.js";
import AppLogoImage from '../components/AppLogoImage.vue';


const isLoading = ref(false);
const error = ref(null);
const sessionExpired = ref(false);
const silentFailed = ref(false);
const silentReason = ref(null);
const oidcInitialized = ref(true);
const appTitle = ref('');
const ssoProviderName = ref('');
const isDark = ref(false);
const logoUrl = ref('');

function handleLogoError() {
  console.log('Error loading app logo.');
}

onMounted(async () => {
  const params = new URLSearchParams(window.location.search);

  // Detect silent auth failure signal from callback
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

  // Check if we were redirected here due to session expiration
  if (sessionStorage.getItem('sessionExpired') === 'true') {
    sessionExpired.value = true;
    sessionStorage.removeItem('sessionExpired');
  }
  // Check for dark mode
  isDark.value = document.documentElement.classList.contains('dark');

  try {
    const status = await authService.checkAuthStatus();
    oidcInitialized.value = status.oidcInitialized;
  } catch (err) {
    error.value = 'Unable to connect to the authentication service.';
  }

  // Attempt silent login only when the user was heading to a protected route
  const redirectPath = sessionStorage.getItem('redirectPath');
  const silentAttempted = sessionStorage.getItem('silentLoginAttempted') === 'true';
  if (redirectPath && !silentAttempted && !silentFailed.value) {
    sessionStorage.setItem('silentLoginAttempted', 'true');
    await authService.silentLogin();
  }

  try {
    appTitle.value = await configService.getAppTitle();
    document.title = appTitle.value;

    const dynamicLogoUrl = await configService.getLogoUrl(isDark.value);
    if (dynamicLogoUrl) {
      logoUrl.value = dynamicLogoUrl;
    }
  } catch (err) {
    console.error('Failed to load app configuration:', err);
  }
});

const login = async () => {
  try {
    isLoading.value = true;
    error.value = null;
    await authService.login();
  } catch (err) {
    error.value = 'Failed to initiate login. Please try again.';
    isLoading.value = false;
  }
};
</script>
