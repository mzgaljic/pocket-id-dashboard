<!-- client/src/views/AdminRequests.vue -->
<template>
  <div>
    <!-- Header with title and back button -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Access Request Management</h1>
      <UButton
        color="gray"
        variant="soft"
        icon="i-heroicons-arrow-left"
        @click="navigateToDashboard"
      >
        Back to Dashboard
      </UButton>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="py-12">
      <div class="flex flex-col items-center justify-center py-12">
        <UIcon name="i-heroicons-arrow-path"
               class="text-gray-400 dark:text-gray-600 w-12 h-12 animate-spin mb-4"/>
        <p class="text-gray-500 dark:text-gray-400">Loading access requests...</p>
      </div>
    </div>

    <!-- Error state -->
    <UCard v-else-if="error" class="my-6 border-red-200 dark:border-red-800">
      <div class="flex flex-col items-center justify-center py-8">
        <UIcon name="i-heroicons-exclamation-circle" class="text-red-500 w-12 h-12 mb-4"/>
        <h3 class="text-xl font-semibold mb-2">Error Loading Requests</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
          {{ error }}
        </p>
        <UButton color="primary" @click="loadRequests">Try Again</UButton>
      </div>
    </UCard>

    <!-- No requests state -->
    <UCard v-else-if="requests.length === 0" class="my-6">
      <div class="flex flex-col items-center justify-center py-12">
        <UIcon name="i-heroicons-check-circle"
               class="text-green-500 w-16 h-16 mb-4"/>
        <h3 class="text-xl font-semibold mb-2">No Pending Requests</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
          There are no pending access requests to review.
        </p>
      </div>
    </UCard>

    <!-- Requests list -->
    <div v-else>
      <UCard v-for="request in requests" :key="request.id" class="mb-6">
        <div class="p-4">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-semibold">
                Request for {{ request.app?.name || 'Unknown App' }}
              </h3>
              <UBadge v-if="request.userId === currentUserId" color="info" variant="subtle">
                My Request
              </UBadge>
              <!-- User information section with visual indicator for missing data -->
              <div class="flex items-center mt-2 mb-1">
                <UAvatar
                  v-if="request.user?.picture"
                  :src="request.user.picture"
                  :alt="request.user.name"
                  size="sm"
                  class="mr-2"
                />
                <UAvatar
                  v-else
                  :text="getUserInitials(request.user?.name || '?')"
                  size="sm"
                  class="mr-2"
                  :color="request.user?.name ? 'gray' : 'amber'"
                />
                <div>
                  <p class="text-sm font-medium">
                    {{ request.user?.name || 'Unknown User' }} ({{ request.user?.email || 'No Email' }})
                    <UBadge v-if="!request.user?.name" color="amber" size="xs" class="ml-1">User Not Found</UBadge>
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    ID: {{ request.userId }}
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Requested: {{ formatDate(request.requestedAt) }}
              </p>
            </div>
            <UBadge
              :color="getStatusColor(request.status)"
              class="text-xs uppercase"
            >
              {{ request.status }}
            </UBadge>
          </div>

          <p v-if="request.notes" class="mb-4 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded">
            {{ request.notes }}
          </p>

          <div v-if="request.status === 'pending'" class="mt-6">
            <div v-if="request.app?.allowedUserGroups?.length" class="mb-4">
              <h4 class="font-medium mb-2">Select groups to add user to:</h4>
              <USelectMenu
                v-model="selectedGroups[request.id]"
                multiple
                :items="getGroupItems(request.app.allowedUserGroups)"
                return-value="value"
                placeholder="Select groups..."
                size="lg"
                :style="{ minWidth: calculateSelectMenuMinWidth(request.app.allowedUserGroups) + 'px' }"
                :ui="{
                  icon: { trailing: { name: 'i-heroicons-chevron-down' } }
                }"
              />
              <p class="text-xs text-gray-500 mt-1">
                {{ selectedGroups[request.id]?.length || 0 }} group(s) selected
              </p>
            </div>
            <div v-else class="text-amber-600 dark:text-amber-400 mb-4">
              No allowed groups found for this application.
            </div>

            <div class="flex space-x-4 mt-4">
              <UButton
                color="green"
                :loading="processingRequestId === request.id && processingAction === 'approve'"
                :disabled="isProcessing || !hasSelectedGroups(request.id)"
                @click="approveRequest(request)"
              >
                Approve
              </UButton>
              <UButton
                color="red"
                variant="soft"
                :loading="processingRequestId === request.id && processingAction === 'reject'"
                :disabled="isProcessing"
                @click="rejectRequest(request)"
              >
                Reject
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { adminService } from '../services/admin';
import { authService } from '../services/auth';

const router = useRouter();
const requests = ref([]);
const loading = ref(true);
const error = ref(null);
const processingRequestId = ref(null);
const processingAction = ref(null);
const selectedGroups = reactive({});
const toast = useToast();
const currentUserId = ref(null);

const isProcessing = computed(() => !!processingRequestId.value);

onMounted(async () => {
  try {
    const userData = await authService.getCurrentUser();
    currentUserId.value = userData?.id;
  } catch (error) {
    console.error('Failed to get current user', error);
  }

  await loadRequests();
});

function navigateToDashboard() {
  router.push('/dashboard');
}

// format groups for USelectMenu
function getGroupItems(groups) {
  if (!groups || !Array.isArray(groups)) return [];

  return groups.map(group => ({
    label: group.name,
    value: group.id,
    description: group.friendlyName || group.description || `Group ID: ${group.id}`
  }));
}

function getUserInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(part => part.charAt(0)).join('').toUpperCase().substring(0, 2);
}

async function loadRequests() {
  try {
    loading.value = true;
    error.value = null;
    const data = await adminService.getAccessRequests();
    requests.value = data;

    // Initialize selected groups for each request
    data.forEach(request => {
      if (!selectedGroups[request.id]) {
        selectedGroups[request.id] = [];
      }
    });

  } catch (err) {
    console.error('Failed to load access requests', err);
    error.value = err.response?.data?.message || 'Failed to load access requests. Please try again.';
  } finally {
    loading.value = false;
  }
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleString();
}


function getStatusColor(status) {
  switch (status) {
    case 'pending': return 'warning';
    case 'approved': return 'success';
    case 'rejected': return 'error';
    default: return 'secondary';
  }
}
function hasSelectedGroups(requestId) {
  return selectedGroups[requestId] && selectedGroups[requestId].length > 0;
}

async function approveRequest(request) {
  if (!hasSelectedGroups(request.id)) {
    toast.add({
      title: 'Selection Required',
      description: 'Please select at least one group to add the user to.',
      icon: 'i-heroicons-exclamation-circle',
      color: 'warning',
      timeout: 5000
    });
    return;
  }

  try {
    processingRequestId.value = request.id;
    processingAction.value = 'approve';

    // Extract just the group IDs from the selected groups
    // USelectMenu might return either the ID strings directly or objects with value property
    const groupIds = selectedGroups[request.id].map(group =>
      typeof group === 'object' && group.value ? group.value : group
    );

    const response = await adminService.updateAccessRequest(request.id, {
      status: 'approved',
      groupIds: groupIds,
      notes: `Approved and added user to ${groupIds.length} group(s)`
    });

    // Check if the response indicates success
    if (response.success) {
      toast.add({
        title: 'Request Approved',
        description: 'The access request has been approved and the user will be added to the selected groups.',
        icon: 'i-heroicons-check-circle',
        color: 'success',
        timeout: 5000
      });
    } else if (response.partialSuccess) {
      // If there was an issue with group assignment
      toast.add({
        title: 'Partial Success',
        description: response.warning || 'The request was marked as approved, but there may have been issues adding the user to groups.',
        icon: 'i-heroicons-exclamation-triangle',
        color: 'warning',
        timeout: 8000
      });
    }

    // Reload requests to show updated status
    await loadRequests();
  } catch (error) {
    console.error('Failed to approve request', error);
    toast.add({
      title: 'Approval Failed',
      description: error.response?.data?.message || 'Failed to approve the request. Please try again.',
      icon: 'i-heroicons-x-circle',
      color: 'error',
      timeout: 5000
    });

    // Reload requests to ensure UI shows correct status
    await loadRequests();
  } finally {
    processingRequestId.value = null;
    processingAction.value = null;
  }
}

async function rejectRequest(request) {
  try {
    processingRequestId.value = request.id;
    processingAction.value = 'reject';

    await adminService.updateAccessRequest(request.id, {
      status: 'rejected'
    });

    toast.add({
      title: 'Request Rejected',
      description: 'The access request has been rejected.',
      icon: 'i-heroicons-check-circle',
      color: 'info',
      timeout: 5000
    });

    // Reload requests to show updated status
    await loadRequests();
  } catch (error) {
    console.error('Failed to reject request', error);
    toast.add({
      title: 'Rejection Failed',
      description: error.response?.data?.message || 'Failed to reject the request. Please try again.',
      icon: 'i-heroicons-x-circle',
      color: 'error',
      timeout: 5000
    });
  } finally {
    processingRequestId.value = null;
    processingAction.value = null;
  }
}

function calculateSelectMenuMinWidth(groups) {
  if (!groups || !Array.isArray(groups) || groups.length === 0) {
    return 250;
  }

  const longestName = groups.reduce((longest, group) => {
    const nameLength = (group.name || '').length;
    return nameLength > longest ? nameLength : longest;
  }, 0);

  const baseWidth = 100; // Pixels for padding, borders, dropdown icon
  const charWidth = 8;   // Average width of a character in pixels

  // Calculate width with minimum of 250px and maximum of 600px
  return Math.max(250, Math.min(600, baseWidth + (charWidth * longestName)));
}
</script>

<style scoped>
.user-info {
  display: flex;
  align-items: center;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
  background-color: rgba(0, 0, 0, 0.03);
}

.dark .user-info {
  background-color: rgba(255, 255, 255, 0.05);
}

.user-details {
  margin-left: 0.75rem;
}

.user-name {
  font-weight: 500;
  font-size: 0.875rem;
}

.user-email, .user-id {
  font-size: 0.75rem;
  color: rgba(107, 114, 128, 1);
}

.dark .user-email, .dark .user-id {
  color: rgba(156, 163, 175, 1);
}
</style>
