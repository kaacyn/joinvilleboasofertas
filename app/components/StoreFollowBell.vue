<template>
  <div class="store-bell">
    <button
      type="button"
      class="store-bell__btn"
      aria-label="Receber avisos desta loja"
      :aria-pressed="isFollowing(establishmentId) ? 'true' : 'false'"
      @click.stop="onBell"
    >
      <svg class="store-bell__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M12 3a6 6 0 0 0-6 6v2.7L4.2 15a1.2 1.2 0 0 0 1 1.9h13.6a1.2 1.2 0 0 0 1-1.9L18 11.7V9a6 6 0 0 0-6-6zm0 18a2.8 2.8 0 0 1-2.7-2h5.4A2.8 2.8 0 0 1 12 21z" />
      </svg>
    </button>
    <p
      v-if="showHint && followHint && hintFor === establishmentId"
      class="store-bell__hint"
      aria-live="polite"
    >{{ followHint }}</p>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  establishmentId: string
  storeName: string
  showHint?: boolean
}>(), {
  showHint: false,
})

const { isFollowing, requestToggle, hint: followHint, hintFor } = useJboStoreFollow()

async function onBell() {
  await requestToggle(props.establishmentId, props.storeName)
}
</script>

<style scoped>
.store-bell {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.store-bell__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--navy-light);
  color: var(--yellow);
  cursor: pointer;
}

.store-bell__icon {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linejoin: round;
}

.store-bell__btn[aria-pressed="true"] .store-bell__icon {
  fill: currentColor;
}

.store-bell__btn:hover {
  border-color: var(--yellow);
}

.store-bell__btn:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
}

.store-bell__hint {
  margin: 0;
  max-width: 14rem;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.3;
  text-align: right;
}
</style>
