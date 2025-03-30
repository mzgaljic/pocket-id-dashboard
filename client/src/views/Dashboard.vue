<!-- src/views/Dashboard.vue -->
<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="py-12">
      <USeparator class="my-4"/>
      <div class="flex flex-col items-center justify-center py-12">
        <UIcon name="i-heroicons-arrow-path"
               class="text-gray-400 dark:text-gray-600 w-12 h-12 animate-spin mb-4"/>
        <p class="text-gray-500 dark:text-gray-400">Loading your applications...</p>
      </div>
      <USeparator class="my-4"/>
    </div>

    <!-- Error state -->
    <UCard v-else-if="error" class="my-6 border-red-200 dark:border-red-800">
      <div class="flex flex-col items-center justify-center py-8">
        <UIcon name="i-heroicons-exclamation-circle" class="text-red-500 w-12 h-12 mb-4"/>
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
        <UIcon name="i-heroicons-folder-open"
               class="text-gray-400 dark:text-gray-600 w-16 h-16 mb-4"/>
        <h3 class="text-xl font-semibold mb-2">No Applications Available</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
          You don't have access to any applications yet.
          {{
            appsToRequest.length > 0 ? 'Request access below to get started.' : 'No applications are available for request at this time.'
          }}
        </p>
        <UButton
          v-if="appsToRequest.length > 0"
          color="primary"
          @click="showAllApps = true"
          class="cursor-pointer"
        >
          Request Access
        </UButton>
      </div>
    </UCard>

    <!-- Apps grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-1">
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
            class="w-12 h-12 object-contain mb-2 mt-8"
            @error="handleLogoError($event, app)"
          />
          <AppLogo v-else :name="app.name" class="w-12 h-12 mb-2 mt-8"/>

          <h3 class="text-lg font-semibold mb-1">{{ app.name }}</h3>
          <!-- Fixed height description with truncation -->
          <div class="h-10 w-full mb-4">
            <p class="text-gray-500 dark:text-gray-300 text-center text-4 line-clamp-2">
              {{ app.description }}
            </p>
          </div>
          <UButton
            color="primary"
            variant="soft"
            icon="i-heroicons-arrow-top-right-on-square"
            class="w-full text-sm py-1"
          >
            Launch App
          </UButton>
        </div>
      </UCard>
    </div>

    <!-- Floating action button for requesting access -->
    <div
      v-if="appsToRequest.length > 0 && !loading && !error"
      class="fixed bottom-8 right-8 z-10"
    >
      <UButton
        color="gray"
        variant="solid"
        @click="toggleRequestPanel"
        class="request-access-btn shadow-xl hover:shadow-2xl transition-all duration-200"
        size="xxl"
      >
        <template #leading>
          <UIcon :name="showAllApps ? 'i-heroicons-x-mark' : 'i-heroicons-plus'" class="w-5 h-5"/>
        </template>
        <ButtonTextTransition :text="showAllApps ? 'Hide Request Panel' : 'Request Access'"/>
      </UButton>
    </div>

    <!-- Request access panel -->
    <UCard v-if="showAllApps" class="mt-8" ref="requestAccessPanel">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold">Request Access to Applications</h3>
            <p class="text-gray-600 dark:text-gray-300 text-sm">
              Select an application to request access
            </p>
          </div>
          <UButton
            color="gray"
            variant="ghost"
            icon="i-heroicons-x-mark"
            @click="showAllApps = false"
            class="cursor-pointer"
          />
        </div>
      </template>
      <!-- Loading state for all apps -->
      <div v-if="loading" class="py-8 text-center">
        <UIcon name="i-heroicons-arrow-path" class="text-gray-400 dark:text-gray-500 w-8 h-8 animate-spin mb-2 mx-auto"/>
        <p class="text-gray-500 dark:text-gray-400">Loading applications...</p>
      </div>
      <!-- No apps to request -->
      <div v-else-if="appsToRequest.length === 0" class="py-8 text-center">
        <UIcon name="i-heroicons-folder-open" class="text-gray-400 dark:text-gray-500 w-8 h-8 mb-2 mx-auto"/>
        <p class="text-gray-500 dark:text-gray-400">You already have access to all available
          applications.</p>
      </div>
      <!-- Apps list -->
      <div v-else class="px-3 pb-2">
        <UCard
          v-for="app in appsToRequest"
          :key="app.id"
          class="bg-gray-50 dark:bg-gray-800 p-4 my-4"
          :class="{
            'border-l-4 border-red-500': app.requestStatus === 'rejected',
            'border-l-4 border-amber-500': app.requestStatus === 'approved' && !app.hasAccess
          }"
        >
          <div class="flex items-center">
            <img
              v-if="app.logo"
              :src="app.logo"
              :alt="app.name"
              class="w-12 h-12 object-contain mr-4 rounded-lg"
              @error="handleLogoError($event, app)"
            />
            <AppLogo v-else :name="app.name" class="mr-4" :class="{ 'w-12 h-12': true }" />
            <div class="flex-1">
              <h4 class="font-bold">{{ app.name }}</h4>
              <p class="text-gray-600 dark:text-gray-300 text-sm">{{ app.description }}</p>

              <p v-if="app.requestStatus === 'rejected'" class="text-red-600 dark:text-red-400 text-xs mt-1">
                Your previous request was rejected. You can request access again.
              </p>
              <p v-if="app.requestStatus === 'approved' && !app.hasAccess" class="text-amber-600 dark:text-amber-400 text-xs mt-1">
                Your access appears to have been revoked. You can request access again.
              </p>
            </div>

            <UButton
              color="primary"
              variant="soft"
              size="sm"
              @click.stop="requestAccess(app.id)"
              :disabled="(app.requested && app.requestStatus === 'pending') || requestingAccess"
              :loading="requestingAccessFor === app.id"
              :icon="getRequestButtonIcon(app)"
              class="ml-4 cursor-pointer"
            >
              <ButtonTextTransition
                :text="getRequestButtonText(app)"
              />
            </UButton>
          </div>
        </UCard>
      </div>
    </UCard>
  </div>
</template>


<script setup>
import { ref, onMounted, computed, nextTick, inject, watch  } from 'vue';
import { useRouter } from 'vue-router';
import { appService } from '../services/apps';
import AppLogo from '../components/AppLogo.vue';
import ButtonTextTransition from '../components/ButtonTextTransition.vue';

const router = useRouter();
const loading = ref(true);
const error = ref(null);
const accessibleApps = ref([]);
const allApps = ref([]);
const showAllApps = ref(false);
const requestedApps = ref([]);
const requestingAccess = ref(false);
const requestingAccessFor = ref(null);
const requestAccessPanel = ref(null);
const toast = useToast();

const appsToRequest = computed(() => {
  // Filter out apps that:
  // 1. User already has access to
  // 2. Are public (available to all users)
  // 3. Have pending requests
  return allApps.value.filter(app => {
    // User doesn't have access
    if (app.hasAccess) return false;

    // App is public (available to everyone)
    if (app.isPublic) return false;

    // Show all other apps (including those with approved requests but no access)
    return true;
  });
});

const reloadTrigger = inject('reloadTrigger', ref(0));
watch(reloadTrigger, async (newValue, oldValue) => {
  if (newValue !== oldValue) {
    console.log('Reload triggered, refreshing apps...');
    await loadApps();
  }
});

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
    // Only show error if not already handled by the interceptor
    if (!err.__redirected) {
      console.error('Failed to load apps', err);
      error.value = err.response?.data?.message || 'Failed to load applications. Please try again.';
    }
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
      color: 'warning',
      timeout: 5000
    });
  }
}

function toggleRequestPanel() {
  showAllApps.value = !showAllApps.value;

  if (showAllApps.value) {
    // Wait for the panel to render before scrolling
    nextTick(() => {
      // Allow a little more time for the DOM to update
      setTimeout(() => {
        if (requestAccessPanel.value && requestAccessPanel.value.$el) {
          // Use scrollIntoView with smooth behavior
          requestAccessPanel.value.$el.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        } else {
          console.error('Request access panel element not found');
        }
      }, 100);
    });
  }
}

async function requestAccess(appId) {
  try {
    requestingAccess.value = true;
    requestingAccessFor.value = appId;

    // Get the app to check what type of request this is
    const app = allApps.value.find(a => a.id === appId);
    const isReRequest = app?.requestStatus === 'rejected';
    const isAccessRevoked = app?.requestStatus === 'approved' && !app.hasAccess;

    // Get the updated request data from the service
    const response = await appService.requestAccess(appId);

    // slight delay for animation
    await new Promise(resolve => setTimeout(resolve, 300));

    // If user already has access, show a message and refresh the app list
    if (response.alreadyHasAccess) {
      toast.add({
        title: 'Access Already Granted',
        description: 'You already have access to this app. Try refreshing to see updates.',
        icon: 'i-heroicons-information-circle',
        color: 'info',
        timeout: 5000,
        actions: [
          {
            label: 'Refresh Apps',
            variant: 'outline',
            onClick: () => loadApps()
          }
        ]
      });
      await loadApps(); // Reload apps to update the UI
      return;
    }

    // Update the local state for allApps array
    const appIndex = allApps.value.findIndex(app => app.id === appId);
    if (appIndex !== -1) {
      // Create a new object to ensure reactivity
      allApps.value[appIndex] = {
        ...allApps.value[appIndex],
        requested: true,
        requestStatus: 'pending'
      };
    }

    // Add to requestedApps array if not already there
    if (!requestedApps.value.includes(appId)) {
      requestedApps.value.push(appId);
    }

    // Check if this is an admin self-request
    if (response.isAdminRequest) {
      toast.add({
        title: 'Admin Self-Request',
        description: 'As an admin, you can approve your own request on the Manage Requests page.',
        icon: 'i-heroicons-information-circle',
        color: 'info',
        timeout: 8000,
        actions: [
          {
            label: 'Go to Requests',
            variant: 'outline',
            onClick: () => router.push('/admin/requests')
          }
        ]
      });
    } else {
      // Determine the appropriate message
      let title = 'Access Requested';
      let description = 'Your request has been submitted to the administrator.';

      if (isReRequest) {
        title = 'Access Re-Requested';
        description = 'Your request has been resubmitted to the administrator.';
      } else if (isAccessRevoked) {
        title = 'Access Re-Requested';
        description = 'Your request for renewed access has been submitted to the administrator.';
      }

      toast.add({
        title,
        description,
        icon: 'i-heroicons-check-circle',
        color: 'success',
        timeout: 5000
      });
    }
  } catch (error) {
    console.error('Failed to request access', error);
    toast.add({
      title: 'Request Failed',
      description: 'There was an error submitting your request. Please try again.',
      icon: 'i-heroicons-x-circle',
      color: 'error',
      timeout: 5000
    });
  } finally {
    requestingAccess.value = false;
    requestingAccessFor.value = null;
  }
}

function handleLogoError(event, app) {
  // Remove the logo URL to fall back to AppLogo component
  app.logo = null;
}

function getRequestButtonText(app) {
  // If user doesn't have access but has an approved request,
  // they likely had access revoked in Pocket ID
  if (app.requestStatus === 'approved' && !app.hasAccess) {
    return 'Request Again';
  }

  if (app.requestStatus === 'rejected') {
    return 'Request Again';
  }

  if (app.requested && app.requestStatus === 'pending') {
    return 'Requested';
  }
  return 'Request Access';
}
function getRequestButtonIcon(app) {
  if ((app.requestStatus === 'approved' && !app.hasAccess) ||
    app.requestStatus === 'rejected') {
    return 'i-heroicons-arrow-path';
  }

  if (app.requested && app.requestStatus === 'pending') {
    return 'i-heroicons-check';
  }

  return 'i-heroicons-key';
}
</script>
