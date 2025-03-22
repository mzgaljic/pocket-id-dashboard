<!-- src/views/Dashboard.vue -->
<template>
  <div>
    <!-- Dashboard header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold">Your Applications</h1>
        <p class="text-gray-500 dark:text-gray-400">Quick access to all your authorized applications</p>
      </div>
      <UButton
        icon="i-heroicons-plus"
        :color="showAllApps ? 'gray' : 'primary'"
        @click="showAllApps = !showAllApps"
      >
        {{ showAllApps ? 'Hide Request Panel' : 'Request More Access' }}
      </UButton>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="py-12">
      <USeparator class="my-4" />
      <div class="flex flex-col items-center justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="text-gray-400 dark:text-gray-600 w-12 h-12 animate-spin mb-4" />
        <p class="text-gray-500 dark:text-gray-400">Loading your applications...</p>
      </div>
      <USeparator class="my-4" />
    </div>

    <!-- No apps state -->
    <UCard v-else-if="accessibleApps.length === 0" class="my-6">
      <div class="flex flex-col items-center justify-center py-12">
        <UIcon name="i-heroicons-folder-open" class="text-gray-400 dark:text-gray-600 w-16 h-16 mb-4" />
        <h3 class="text-xl font-semibold mb-2">No Applications Available</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
          You don't have access to any applications yet. Request access below.
        </p>
        <UButton color="primary" @click="showAllApps = true">Request Access</UButton>
      </div>
    </UCard>

    <!-- Apps grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <UCard
        v-for="app in accessibleApps"
        :key="app.id"
        class="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
        @click="launchApp(app)"
      >
        <div class="flex flex-col items-center p-4">
          <AppLogo :name="app.name" :logo-url="app.logo" class="mb-4" />
          <h3 class="text-lg font-semibold mb-2">{{ app.name }}</h3>
          <p class="text-gray-500 dark:text-gray-400 text-center mb-6">{{ app.description }}</p>
          <UButton
            color="primary"
            variant="soft"
            icon="i-heroicons-arrow-top-right-on-square"
            class="w-full"
          >
            Launch App
          </UButton>
        </div>
      </UCard>
    </div>

    <!-- Request access panel -->
    <UCard v-if="showAllApps" class="mt-8">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold">Request Access to Applications</h3>
            <p class="text-gray-500 dark:text-gray-400 text-sm">
              Select an application to request access
            </p>
          </div>
          <UButton
            color="gray"
            variant="ghost"
            icon="i-heroicons-x-mark"
            @click="showAllApps = false"
          />
        </div>
      </template>

      <div class="space-y-4 mt-2">
        <UCard
          v-for="app in allApps"
          :key="app.id"
          :ui="{ body: { padding: 'p-4' } }"
          class="bg-gray-50 dark:bg-gray-800"
        >
          <div class="flex items-center">
            <AppLogo :name="app.name" :logo-url="app.logo" class="mr-4" />
            <div class="flex-1">
              <h4 class="font-medium">{{ app.name }}</h4>
              <p class="text-gray-500 dark:text-gray-400 text-sm">{{ app.description }}</p>
            </div>
            <UBadge v-if="app.hasAccess" color="green" variant="subtle" class="ml-4">
              <template #default>
                <span class="flex items-center">
                  <UIcon name="i-heroicons-check-circle" class="mr-1" />
                  Access Granted
                </span>
              </template>
            </UBadge>
            <UButton
              v-else
              color="primary"
              variant="soft"
              size="sm"
              @click.stop="requestAccess(app.id)"
              :disabled="requestedApps.includes(app.id)"
              :icon="requestedApps.includes(app.id) ? 'i-heroicons-check' : 'i-heroicons-key'"
              class="ml-4"
            >
              {{ requestedApps.includes(app.id) ? 'Requested' : 'Request Access' }}
            </UButton>
          </div>
        </UCard>
      </div>
    </UCard>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { appService } from '../services/apps';
import AppLogo from '../components/AppLogo.vue';

const loading = ref(true);
const accessibleApps = ref([]);
const allApps = ref([]);
const showAllApps = ref(false);
const requestedApps = ref([]);
const toast = useToast(); // Use the toast composable

onMounted(async () => {
  try {
    // Simulate loading delay for demo purposes
    setTimeout(async () => {
      const data = await appService.getApps();
      accessibleApps.value = data.accessibleApps;
      allApps.value = data.allApps;
      loading.value = false;
    }, 1000);
  } catch (error) {
    console.error('Failed to load apps', error);
    loading.value = false;
  }
});

const launchApp = (app) => {
  window.location.href = app.redirectUri;
};

const requestAccess = async (appId) => {
  try {
    await appService.requestAccess(appId);
    requestedApps.value.push(appId);

    // Show notification using the toast composable
    toast.add({
      title: 'Access Requested',
      description: 'Your request has been submitted to the administrator.',
      icon: 'i-heroicons-check-circle',
      color: 'green',
      timeout: 5000
    });
  } catch (error) {
    console.error('Failed to request access', error);

    // Show error notification
    toast.add({
      title: 'Request Failed',
      description: 'There was an error submitting your request. Please try again.',
      icon: 'i-heroicons-x-circle',
      color: 'red',
      timeout: 5000
    });
  }
};
</script>

<!-- Rest of your template remains the same -->
