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
      <div v-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
        <p class="text-red-700 dark:text-red-400 text-sm">
          <strong>Error:</strong> {{ error }}
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
import {configService} from "@/services/config.js";
import AppLogoImage from '../components/AppLogoImage.vue';


const isLoading = ref(false);
const error = ref(null);
const oidcInitialized = ref(true);
const appTitle = ref('');
const ssoProviderName = ref('');
const isDark = ref(false);
const logoUrl = ref('');

function handleLogoError() {
  console.log('Error loading app logo.');
}

onMounted(async () => {
  // Check for dark mode
  isDark.value = document.documentElement.classList.contains('dark');

  try {
    const status = await authService.checkAuthStatus();
    oidcInitialized.value = status.oidcInitialized;
  } catch (err) {
    error.value = 'Unable to connect to the authentication service.';
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
