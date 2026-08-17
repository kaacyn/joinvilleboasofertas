<template>
  <div v-if="canInstall" class="install">
    <button
      type="button"
      class="install__btn"
      aria-label="Instalar aplicativo"
      @click="promptInstall"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3v12" />
        <path d="m8 11 4 4 4-4" />
        <path d="M5 21h14" />
      </svg>
    </button>

    <IosInstallModal v-model:open="showIosModal" :is-safari="isSafariOnIOS" />
    <AndroidInstallModal v-model:open="showAndroidModal" />
  </div>
</template>

<script setup lang="ts">
const {
  canInstall,
  isSafariOnIOS,
  showIosModal,
  showAndroidModal,
  promptInstall,
} = usePwaInstall()
</script>

<style scoped>
.install {
  flex-shrink: 0;
}

.install__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--navy-light);
  color: var(--yellow);
  cursor: pointer;
}

.install__btn:hover {
  border-color: var(--yellow);
}

.install__btn:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
}
</style>
