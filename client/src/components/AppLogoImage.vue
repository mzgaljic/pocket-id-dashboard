<!-- client/src/components/AppLogoImage.vue -->
<template>
  <div class="app-logo-container" :class="[sizeClass, { 'dark-mode': isDark }]">
    <img
      :src="src"
      :alt="alt"
      class="app-logo-image"
      @error="handleError"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  src: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: 'App Logo'
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl'].includes(value)
  },
  isDark: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['error']);

// Compute size class based on size prop
const sizeClass = computed(() => `size-${props.size}`);

// Handle image load errors
function handleError(event) {
  console.error('Error loading logo:', event);
  emit('error', event);
}
</script>

<style scoped>
.app-logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: transparent;
}

.app-logo-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain; /* This preserves aspect ratio */
}

/* Size variants */
.size-sm {
  width: 32px;
  height: 32px;
}

.size-md {
  width: 48px;
  height: 48px;
}

.size-lg {
  width: 64px;
  height: 64px;
}

.size-xl {
  width: 96px;
  height: 96px;
}

/* Add a subtle background for better visibility in dark mode */
.dark-mode .app-logo-image {
  background-color: transparent;
}
</style>
