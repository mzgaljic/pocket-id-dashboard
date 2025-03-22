<!-- src/views/Profile.vue -->
<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Your Profile</h1>

    <UCard v-if="user" class="max-w-2xl">
      <div class="flex items-start space-x-6">
        <UAvatar
          :src="user.picture"
          :text="getUserInitials(user.name)"
          size="xl"
          class="flex-shrink-0"
        />
        <div class="flex-1">
          <h2 class="text-xl font-semibold mb-2">{{ user.name }}</h2>
          <p class="text-gray-500 dark:text-gray-400 mb-4">{{ user.email }}</p>

          <h3 class="font-medium mb-2 mt-4">Your Groups</h3>
          <div class="flex flex-wrap gap-2 mb-4">
            <UBadge
              v-for="group in user.groups"
              :key="group"
              color="primary"
              variant="soft"
              class="capitalize"
            >
              {{ group }}
            </UBadge>
            <p v-if="!user.groups || user.groups.length === 0" class="text-gray-500 dark:text-gray-400">
              No groups assigned
            </p>
          </div>
        </div>
      </div>
    </UCard>

    <div v-else class="flex justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="text-gray-400 dark:text-gray-600 w-12 h-12 animate-spin" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { authService } from '../services/auth';

const user = ref(null);

onMounted(async () => {
  user.value = await authService.getCurrentUser();
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
</script>
