<template>
  <div class="app-shell">
    <NuxtPwaManifest />
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <StoreFollowConfirmModal
      :open="confirmOpen"
      :store-name="confirmStoreName"
      :instruction-mode="instructionMode"
      @confirm="confirmFollow"
      @cancel="cancelFollow"
    />
  </div>
</template>

<script setup lang="ts">
usePwaBackGuard()

const {
  confirmOpen,
  confirmStoreName,
  instructionMode,
  confirmFollow,
  cancelFollow,
} = useJboStoreFollow()
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
}
</style>
