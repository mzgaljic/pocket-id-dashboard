<!-- src/views/Settings.vue -->
<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Settings</h1>

    <UCard class="max-w-2xl mb-6">
      <template #header>
        <h2 class="text-lg font-semibold">Appearance</h2>
      </template>
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="font-medium">Dark Mode</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Toggle between light and dark theme
            </p>
          </div>
          <UButton
            color="gray"
            variant="ghost"
            :icon="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'"
            @click="toggleDarkMode"
          />
        </div>
      </div>
    </UCard>

    <UCard class="max-w-2xl">
      <template #header>
        <h2 class="text-lg font-semibold">Account</h2>
      </template>
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="font-medium">Sign Out</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              End your current session
            </p>
          </div>
          <UButton
            color="red"
            variant="soft"
            icon="i-heroicons-arrow-right-on-rectangle"
            @click="logout"
            :loading="isLoggingOut"
          >
            Sign Out
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { authService } from '../services/auth';

const isDark = ref(document.documentElement.classList.contains('dark'));
const isLoggingOut = ref(false);
const toast = useToast();

const toggleDarkMode = () => {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('color-theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('color-theme', 'light');
  }
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
