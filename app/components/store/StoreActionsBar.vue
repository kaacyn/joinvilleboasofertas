<template>
  <div class="store-actions">
    <p class="store-actions__status" aria-live="polite">{{ statusText }}</p>
    <div class="store-actions__bar" role="group" aria-label="Ações da loja">
      <button
        v-if="hasAddresses"
        type="button"
        class="store-actions__btn"
        aria-label="Ver endereços da loja"
        aria-haspopup="dialog"
        title="Endereços"
        data-test="store-addresses-open"
        @click="emit('addresses')"
      >
        <svg class="store-actions__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
          <circle cx="12" cy="10" r="2.4" />
        </svg>
      </button>
      <button
        type="button"
        class="store-actions__btn"
        aria-label="Compartilhar loja"
        title="Compartilhar"
        data-test="store-share"
        @click="onShare"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="18" cy="5" r="2.5" fill="currentColor" />
          <circle cx="6" cy="12" r="2.5" fill="currentColor" />
          <circle cx="18" cy="19" r="2.5" fill="currentColor" />
          <path
            d="M8.4 10.8 15.6 6.7M8.4 13.2l7.2 4.1"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <StoreFollowBell :establishment-id="establishmentId" :store-name="storeName" />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  establishmentId: string
  storeName: string
  shareUrl: string
  hasAddresses: boolean
}>()

const emit = defineEmits<{
  addresses: []
}>()

const { status: shareStatus, share } = useShareLink()
const { hint: followHint, hintFor } = useJboStoreFollow()

/** Uma linha só para os avisos da barra: compartilhar tem prioridade. */
const statusText = computed(() => {
  if (shareStatus.value === 'copied') return 'Link copiado'
  if (shareStatus.value === 'failed') return 'Não foi possível compartilhar agora.'
  return hintFor.value === props.establishmentId ? followHint.value : ''
})

async function onShare() {
  await share({
    title: `Ofertas em ${props.storeName}`,
    text: `Veja as ofertas de ${props.storeName} no Joinville Boas Ofertas`,
    url: props.shareUrl,
  })
}
</script>

<style scoped>
/* Aviso à esquerda dos botões, no espaço livre da linha: não empurra o nome. */
.store-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
}

.store-actions__bar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.store-actions__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink-2);
  cursor: pointer;
}

.store-actions__icon {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linejoin: round;
}

.store-actions__btn:hover {
  border-color: var(--ink-3);
}

.store-actions__btn:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
}

.store-actions__status {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: var(--ink-3);
  font-size: 0.82rem;
  line-height: 1.3;
  text-align: right;
}
</style>
