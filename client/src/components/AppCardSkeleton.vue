<!-- client/src/components/AppCardSkeleton.vue -->
<template>
  <UCard class="app-card-skeleton">
    <div class="skeleton-content">
      <div class="skeleton-header">
        <div class="skeleton-logo"></div>
      </div>
      <div class="skeleton-body">
        <div class="skeleton-title"></div>
        <div class="skeleton-description"></div>
        <div class="skeleton-description" style="width: 70%"></div>
      </div>
      <div class="skeleton-footer">
        <div class="skeleton-button"></div>
      </div>
    </div>
  </UCard>
</template>

<style scoped>
.app-card-skeleton {
  height: 100%;
}

.skeleton-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.skeleton-header {
  padding: 1.5rem;
  display: flex;
  justify-content: center;
  background-color: #f1f5f9;
}

.skeleton-logo {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background-color: #e2e8f0;
  animation: pulse 1.5s infinite;
}

.skeleton-body {
  padding: 1.5rem;
  flex: 1;
}

.skeleton-title {
  height: 24px;
  width: 70%;
  background-color: #e2e8f0;
  border-radius: 4px;
  margin-bottom: 1rem;
  animation: pulse 1.5s infinite;
}

.skeleton-description {
  height: 16px;
  width: 100%;
  background-color: #e2e8f0;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  animation: pulse 1.5s infinite;
}

.skeleton-footer {
  padding: 0 1.5rem 1.5rem;
}

.skeleton-button {
  height: 40px;
  width: 100%;
  background-color: #e2e8f0;
  border-radius: 6px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.7;
  }
  50% {
    opacity: 0.4;
  }
}
</style>
