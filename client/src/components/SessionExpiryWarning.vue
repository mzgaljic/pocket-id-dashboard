<!-- client/src/components/SessionExpiryWarning.vue -->

<template>
  <div v-if="showWarning" class="session-expiry-warning">
    <UCard class="max-w-md mx-auto">
      <template #header>
        <div class="flex items-center text-amber-500">
          <UIcon name="i-heroicons-clock" class="mr-2" />
          <h3 class="text-lg font-medium">Session Expiring Soon</h3>
        </div>
      </template>

      <p class="mb-4">Your session will expire in {{ minutesRemaining }} minutes.</p>

      <template #footer>
        <div class="flex justify-between">
          <UButton color="primary" @click="handleReAuthenticate">
            Refresh my session
          </UButton>
          <UButton color="gray" variant="ghost" @click="dismissWarning">
            Dismiss
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/auth';

const router = useRouter();
const showWarning = ref(false);
const minutesRemaining = ref(5);
let checkInterval = null;

// Function to check token expiry
async function checkTokenExpiry() {
  try {
    const status = await authService.checkAuthStatus();
    if (status.expiresInMinutes !== null && status.expiresInMinutes <= 5 && status.expiresInMinutes > 0) {
      minutesRemaining.value = Math.max(1, Math.floor(status.expiresInMinutes));
      showWarning.value = true;
    } else {
      showWarning.value = false;
    }
  } catch (error) {
    console.error('Failed to check token expiry:', error);
  }
}

// Function to re-authenticate
function handleReAuthenticate() {
  authService.login();
}

// Function to dismiss the warning
function dismissWarning() {
  showWarning.value = false;
}

onMounted(() => {
  // Check token expiry every minute
  checkTokenExpiry();
  checkInterval = setInterval(checkTokenExpiry, 60000);
});

onBeforeUnmount(() => {
  // Clean up interval
  if (checkInterval) {
    clearInterval(checkInterval);
  }
});
</script>

<style scoped>
.session-expiry-warning {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  max-width: 400px;
  animation: slide-in 0.3s ease-out;
}

@keyframes slide-in {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
