<template>
  <div class="app-shell">
    <NuxtPwaManifest />
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
}
</style>
