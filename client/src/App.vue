<!-- src/App.vue -->
<template>
  <UApp>
    <UContainer class="py-8">
      <header class="flex justify-between items-center mb-8 pb-4 border-b border-gray-200 dark:border-gray-700">
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
        </div>
      </header>


      <main>
        <div v-if="!user" class="flex items-center justify-center min-h-[60vh]">
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

        <router-view v-else />
      </main>

      <footer class="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400">
        <p>&copy; {{ new Date().getFullYear() }} Pocket-ID Dashboard. All rights reserved.</p>
      </footer>
    </UContainer>
  </UApp>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from './services/auth';

const user = ref(null);
const router = useRouter();
const isDark = ref(false);
const toast = useToast();
const isLoggingOut = ref(false);

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
});

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
      click: () => router.push('/profile')
    },
    {
      label: 'Settings',
      icon: 'i-heroicons-cog-6-tooth',
      click: () => router.push('/settings')
    }
  ],
  [
    {
      label: isLoggingOut.value ? 'Logging out...' : 'Sign Out',
      icon: isLoggingOut.value ? 'i-heroicons-arrow-path' : 'i-heroicons-arrow-right-on-rectangle',
      disabled: isLoggingOut.value,
      onSelect: () => logout(),
      // Add a loading indicator in the menu item
      trailing: isLoggingOut.value ? {
        component: 'UProgress',
        props: {
          size: 'xs',
          animation: 'carousel',
          class: 'w-4 h-4'
        }
      } : undefined
    }
  ]
]);

onMounted(async () => {
  try {
    user.value = await authService.getCurrentUser();
    if (user.value) {
      router.push('/dashboard');
    }
  } catch (error) {
    console.error('Not authenticated', error);
  }
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
  window.location.href = '/auth/login';
};

const logout = async () => {
  try {
    isLoggingOut.value = true;

    // Call the logout service
    await authService.logout();

    // Show success toast
    toast.add({
      title: 'Logged Out',
      description: 'You have been successfully logged out.',
      icon: 'i-heroicons-check-circle',
      color: 'green',
      timeout: 3000
    });

    // Clear user data
    user.value = null;

    // Redirect to login page
    await router.push('/');
  } catch (error) {
    console.error('Logout failed', error);

    // Show error toast
    toast.add({
      title: 'Logout Failed',
      description: 'There was a problem logging you out. Please try again.',
      icon: 'i-heroicons-x-circle',
      color: 'red',
      timeout: 5000
    });
  } finally {
    isLoggingOut.value = false;
  }
};
</script>
