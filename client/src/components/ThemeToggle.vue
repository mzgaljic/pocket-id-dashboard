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
import { ref, onMounted, watch } from 'vue';

const isDark = ref(false);

const toggleTheme = () => {
  isDark.value = !isDark.value;
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
  applyTheme();
};

const applyTheme = () => {
  if (isDark.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

onMounted(() => {
  // Check for saved theme preference or use system preference
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme) {
    isDark.value = savedTheme === 'dark';
  } else {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  applyTheme();
});

// Watch for system theme changes
watch(
  () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  (isDarkMode) => {
    if (localStorage.getItem('theme') === null) {
      isDark.value = isDarkMode;
      applyTheme();
    }
  }
);
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
