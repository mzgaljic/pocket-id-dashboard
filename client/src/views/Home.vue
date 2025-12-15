<!-- src/views/Home.vue -->
<template>
  <div class="flex items-center justify-center min-h-[70vh] px-4">
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
      <div v-if="sessionExpired || error" class="px-6 pb-2">
        <div
          v-if="sessionExpired"
          class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4"
        >
          <p class="text-amber-800 dark:text-amber-300 text-sm">
            <strong>Session expired:</strong> Please sign in again.
          </p>
        </div>
        <div
          v-if="error"
          class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4"
        >
          <p class="text-red-800 dark:text-red-300 text-sm">
            <strong>Error:</strong> {{ error }}
          </p>
        </div>
      </div>
      <template #footer>
        <div class="px-6 pb-6 pt-2 flex flex-col items-center">
          <UButton
            color="primary"
            variant="solid"
            size="xl"
            icon="i-heroicons-arrow-right-on-rectangle"
            class="h-12 text-base font-semibold shadow-sm hover:shadow-md w-full sm:w-auto px-2 sm:px-8"
            @click="login"
            :loading="isLoading"
            :disabled="isLoading || !oidcInitialized"
          >
            Sign In with {{ ssoProviderName || 'SSO' }}
          </UButton>
          <p v-if="!oidcInitialized" class="text-center text-amber-700 dark:text-amber-300 text-sm mt-3">
            Single sign-on is initializing… please wait a moment.
          </p>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { authService } from '../services/auth';
import { configService } from "../services/config.js";
import { useTheme } from '../composables/useTheme';
import AppLogoImage from '../components/AppLogoImage.vue';

const isLoading = ref(false);
const error = ref(null);
const sessionExpired = ref(false);
const oidcInitialized = ref(true);
const appTitle = ref('');
const ssoProviderName = ref('');
const { isDark } = useTheme();
const logoUrl = ref('');

function handleLogoError() {
  console.log('Error loading app logo.');
}

onMounted(async () => {
  // Check if we were redirected here due to session expiration
  if (sessionStorage.getItem('sessionExpired') === 'true') {
    sessionExpired.value = true;
    sessionStorage.removeItem('sessionExpired');
  }

  try {
    const status = await authService.checkAuthStatus();
    oidcInitialized.value = status.oidcInitialized;
  } catch (err) {
    error.value = 'Unable to connect to the authentication service.';
  }

  try {
    appTitle.value = await configService.getAppTitle();
    document.title = appTitle.value;
    ssoProviderName.value = await configService.getSsoProviderName();

    const dynamicLogoUrl = await configService.getLogoUrl(isDark.value);
    if (dynamicLogoUrl) {
      logoUrl.value = dynamicLogoUrl;
    }
  } catch (err) {
    console.error('Failed to load app configuration:', err);
  }
});

// Watch for theme changes to update logo
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

const login = () => {
  // Redirect happens immediately; no need to await
  isLoading.value = true;
  error.value = null;
  authService.login();
};
</script>
