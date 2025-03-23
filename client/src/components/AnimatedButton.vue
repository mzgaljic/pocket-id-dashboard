<!-- client/src/components/AnimatedButton.vue -->
<template>
  <UButton
    v-bind="$attrs"
    :class="['animated-button', { 'is-animating': isAnimating }]"
    @click="handleClick"
  >
    <transition name="button-text-fade" mode="out-in">
      <span :key="currentText" class="inline-block">
        {{ currentText }}
      </span>
    </transition>
  </UButton>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  text: {
    type: String,
    default: ''
  },
  loadingText: {
    type: String,
    default: 'Loading...'
  },
  successText: {
    type: String,
    default: 'Success!'
  },
  loading: {
    type: Boolean,
    default: false
  },
  success: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['click']);

const isAnimating = ref(false);
const currentText = computed(() => {
  if (props.loading) return props.loadingText;
  if (props.success) return props.successText;
  return props.text;
});

function handleClick(event) {
  if (props.loading) return;

  isAnimating.value = true;
  setTimeout(() => {
    isAnimating.value = false;
  }, 300);

  emit('click', event);
}

// Reset animation state when props change
watch(() => props.loading, () => {
  isAnimating.value = false;
});

watch(() => props.success, () => {
  isAnimating.value = false;
});
</script>

<style scoped>
.animated-button {
  position: relative;
  overflow: hidden;
  transition: transform 0.1s ease;
}

.animated-button:active:not(:disabled) {
  transform: scale(0.97);
}

.animated-button.is-animating {
  animation: button-press 0.3s ease;
}

@keyframes button-press {
  0% { transform: scale(1); }
  50% { transform: scale(0.97); }
  100% { transform: scale(1); }
}

/* Simple fade transition */
.button-text-fade-enter-active,
.button-text-fade-leave-active {
  transition: opacity 0.15s ease;
}

.button-text-fade-enter-from,
.button-text-fade-leave-to {
  opacity: 0;
}
</style>
