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

    <!-- Error state -->
    <UCard v-else-if="error" class="my-6 border-red-200 dark:border-red-800">
      <div class="flex flex-col items-center justify-center py-8">
        <UIcon name="i-heroicons-exclamation-circle" class="text-red-500 w-12 h-12 mb-4" />
        <h3 class="text-xl font-semibold mb-2">Error Loading Applications</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
          {{ error }}
        </p>
        <UButton color="primary" @click="loadApps">Try Again</UButton>
      </div>
    </UCard>

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
          <img
            v-if="app.logo"
            :src="app.logo"
            :alt="app.name"
            class="w-16 h-16 object-contain mb-4 rounded-lg"
            @error="handleLogoError($event, app)"
          />
          <AppLogo
            v-else
            :name="app.name"
            class="mb-4"
          />
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

      <!-- Loading state for all apps -->
      <div v-if="loading" class="py-8 text-center">
        <UIcon name="i-heroicons-arrow-path" class="text-gray-400 dark:text-gray-600 w-8 h-8 animate-spin mb-2 mx-auto" />
        <p class="text-gray-500 dark:text-gray-400">Loading applications...</p>
      </div>

      <!-- No apps to request -->
      <div v-else-if="allApps.length === 0" class="py-8 text-center">
        <UIcon name="i-heroicons-folder-open" class="text-gray-400 dark:text-gray-600 w-8 h-8 mb-2 mx-auto" />
        <p class="text-gray-500 dark:text-gray-400">No applications available to request.</p>
      </div>

      <!-- Apps list -->
      <div v-else class="space-y-4 mt-2">
        <UCard
          v-for="app in allApps"
          :key="app.id"
          :ui="{ body: { padding: 'p-4' } }"
          class="bg-gray-50 dark:bg-gray-800"
        >
          <div class="flex items-center">
            <img
              v-if="app.logo"
              :src="app.logo"
              :alt="app.name"
              class="w-12 h-12 object-contain mr-4 rounded-lg"
              @error="handleLogoError($event, app)"
            />
            <AppLogo
              v-else
              :name="app.name"
              class="mr-4"
              :class="{ 'w-12 h-12': true }"
            />
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
              :disabled="requestedApps.includes(app.id) || requestingAccess"
              :loading="requestingAccessFor === app.id"
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
const error = ref(null);
const accessibleApps = ref([]);
const allApps = ref([]);
const showAllApps = ref(false);
const requestedApps = ref([]);
const requestingAccess = ref(false);
const requestingAccessFor = ref(null);
const toast = useToast();

onMounted(() => {
  loadApps();
});

async function loadApps() {
  try {
    loading.value = true;
    error.value = null;

    const data = await appService.getApps();
    accessibleApps.value = data.accessibleApps;
    allApps.value = data.allApps;

    console.log(`Loaded ${accessibleApps.value.length} accessible apps and ${allApps.value.length} total apps`);
  } catch (err) {
    console.error('Failed to load apps', err);
    error.value = err.response?.data?.message || 'Failed to load applications. Please try again.';
  } finally {
    loading.value = false;
  }
}

function launchApp(app) {
  if (app.redirectUri && app.redirectUri !== '#') {
    window.open(app.redirectUri, '_blank');
  } else {
    toast.add({
      title: 'Launch Failed',
      description: 'This application does not have a valid launch URL.',
      icon: 'i-heroicons-exclamation-circle',
      color: 'amber',
      timeout: 5000
    });
  }
}

async function requestAccess(appId) {
  try {
    requestingAccess.value = true;
    requestingAccessFor.value = appId;

    await appService.requestAccess(appId);
    requestedApps.value.push(appId);

    toast.add({
      title: 'Access Requested',
      description: 'Your request has been submitted to the administrator.',
      icon: 'i-heroicons-check-circle',
      color: 'green',
      timeout: 5000
    });
  } catch (error) {
    console.error('Failed to request access', error);

    toast.add({
      title: 'Request Failed',
      description: 'There was an error submitting your request. Please try again.',
      icon: 'i-heroicons-x-circle',
      color: 'red',
      timeout: 5000
    });
  } finally {
    requestingAccess.value = false;
    requestingAccessFor.value = null;
  }
}

function handleLogoError(event, app) {
  console.warn(`Failed to load logo for app ${app.id}`, event);
  // Remove the logo URL to fall back to AppLogo component
  app.logo = null;
}
</script>
