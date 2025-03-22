<!-- client/src/components/AppCard.vue -->
<template>
  <UCard
    class="app-card"
    :ui="{ body: { padding: 'p-0' } }"
    @click="$emit('click')"
  >
    <div class="app-card-content">
      <div class="app-card-header">
        <img :src="app.logo" :alt="app.name" class="app-logo">
      </div>
      <div class="app-card-body">
        <h3 class="app-title">{{ app.name }}</h3>
        <p class="app-description">{{ app.description }}</p>
      </div>
      <div class="app-card-footer">
        <UButton
          block
          color="primary"
          variant="soft"
          class="launch-btn"
          icon="i-heroicons-arrow-top-right-on-square"
        >
          Launch App
        </UButton>
      </div>
    </div>
  </UCard>
</template>

<script setup>
defineProps({
  app: {
    type: Object,
    required: true
  }
});

defineEmits(['click']);
</script>

<style scoped>
.app-card {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.app-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.app-card-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.app-card-header {
  padding: 1.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--secondary-color);
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
}

.app-logo {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: cover;
}

.app-card-body {
  padding: 1.5rem;
  flex: 1;
}

.app-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  color: var(--text-color);
}

.app-description {
  font-size: 0.875rem;
  color: var(--text-light);
  margin: 0;
  line-height: 1.5;
}

.app-card-footer {
  padding: 0 1.5rem 1.5rem;
}

.launch-btn {
  font-weight: 500;
}
</style>
