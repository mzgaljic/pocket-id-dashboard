import { ref, watch, onMounted } from 'vue';

// Shared state across all components
const isDark = ref(false);
const isInitialized = ref(false);

const applyTheme = () => {
  if (isDark.value) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
};

const toggleTheme = () => {
  isDark.value = !isDark.value;
  applyTheme();
};

const initializeTheme = () => {
  if (isInitialized.value) return;

  // Check for saved theme preference or use system preference
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme) {
    isDark.value = savedTheme === 'dark';
  } else {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  applyTheme();
  isInitialized.value = true;

  // Watch for system theme changes (only if no manual preference is saved)
  const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  darkModeMediaQuery.addEventListener('change', (e) => {
    // Only auto-switch if user hasn't set a manual preference
    if (localStorage.getItem('theme') === null) {
      isDark.value = e.matches;
      applyTheme();
    }
  });
};

export function useTheme() {
  onMounted(() => {
    initializeTheme();
  });

  return {
    isDark,
    toggleTheme,
    applyTheme,
  };
}



