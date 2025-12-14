<!-- client/src/components/ThemeToggle.vue -->
<template>
  <UButton
    color="gray"
    variant="ghost"
    :icon="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'"
    @click="toggleTheme"
    class="theme-toggle"
  />
</template>

<script setup>
import { useTheme } from '../composables/useTheme';

const { isDark, toggleTheme } = useTheme();
</script>

<style scoped>
.theme-toggle {
  border-radius: 50%;
  width: 40px;
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
