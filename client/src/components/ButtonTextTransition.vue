<!-- client/src/components/ButtonTextTransition.vue -->
<template>
  <transition
    name="button-text-fade"
    mode="out-in"
  >
    <span :key="text" class="inline-block">
      {{ text }}
    </span>
  </transition>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    required: true
  }
});
</script>

<style scoped>
.button-text-fade-enter-active,
.button-text-fade-leave-active {
  transition: opacity 0.15s ease;
}

.button-text-fade-enter-from,
.button-text-fade-leave-to {
  opacity: 0;
}
</style>
