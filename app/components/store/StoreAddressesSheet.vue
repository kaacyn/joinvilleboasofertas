<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="overlay"
      class="addr-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="addr-sheet-title"
      data-test="store-addresses"
    >
      <div class="addr-sheet__backdrop" aria-hidden="true" @click="onClose" />
      <div class="addr-sheet__panel">
        <header class="addr-sheet__head">
          <div class="addr-sheet__heading">
            <h2 id="addr-sheet-title" class="addr-sheet__title">{{ title }}</h2>
            <p class="addr-sheet__store">{{ storeName }}</p>
          </div>
          <button
            ref="closeButton"
            type="button"
            class="addr-sheet__close"
            aria-label="Fechar endereços"
            @click="onClose"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <ul class="addr-sheet__list">
          <li v-for="item in items" :key="item.address" class="addr-sheet__item">
            <p class="addr-sheet__address">
              <svg class="addr-sheet__pin" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
                <circle cx="12" cy="10" r="2.4" />
              </svg>
              <span>{{ item.address }}</span>
            </p>

            <div class="addr-sheet__actions">
              <a
                class="addr-sheet__btn addr-sheet__btn--primary"
                :href="item.mapsUrl"
                target="_blank"
                rel="noopener"
                :aria-label="`Como chegar em ${item.address} pelo Google Maps`"
                data-test="store-directions"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M12 2.8 21.2 12 12 21.2 2.8 12z" />
                  <path d="M9.5 14v-2.2a1 1 0 0 1 1-1H15m-2-2 2 2-2 2" />
                </svg>
                Como chegar
              </a>
              <a
                class="addr-sheet__btn"
                :href="item.wazeUrl"
                target="_blank"
                rel="noopener"
                :aria-label="`Abrir ${item.address} no Waze`"
              >Waze</a>
            </div>

            <ul v-if="item.phones.length" class="addr-sheet__phones">
              <li v-for="phone in item.phones" :key="phone.number" class="addr-sheet__phone">
                <a :href="phone.tel" :aria-label="`Ligar para ${phone.number}`">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path d="M6.6 3.5h2.6l1.4 4-2 1.3a11 11 0 0 0 6.6 6.6l1.3-2 4 1.4v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z" />
                  </svg>
                  {{ phone.number }}
                </a>
                <a
                  v-if="phone.whatsapp"
                  :href="phone.whatsapp"
                  target="_blank"
                  rel="noopener"
                  :aria-label="`Conversar no WhatsApp pelo ${phone.number}`"
                >WhatsApp</a>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  googleMapsDirectionsUrl,
  phoneHref,
  wazeUrl,
  whatsappUrl,
  type StoreBranch,
} from '~/utils/storeDirections'

const props = defineProps<{
  open: boolean
  storeName: string
  branches: StoreBranch[]
}>()

const emit = defineEmits<{
  close: []
}>()

const title = computed(() =>
  props.branches.length === 1 ? 'Endereço' : `${props.branches.length} endereços`,
)

/** Links prontos por filial; telefone sem dígito útil some da lista. */
const items = computed(() =>
  props.branches.map(branch => ({
    address: branch.address,
    mapsUrl: googleMapsDirectionsUrl(branch, props.storeName),
    wazeUrl: wazeUrl(branch, props.storeName),
    phones: branch.phones.flatMap((phone) => {
      const tel = phoneHref(phone.number)
      if (!tel) return []
      return [{
        number: phone.number,
        tel,
        whatsapp: phone.is_whatsapp ? whatsappUrl(phone.number) : null,
      }]
    }),
  })),
)

const overlay = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)

function onClose() {
  emit('close')
}

useDialogLock(toRef(props, 'open'), overlay, closeButton, onClose)
</script>

<style scoped>
.addr-sheet {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.addr-sheet__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.62);
  cursor: pointer;
}

.addr-sheet__panel {
  position: relative;
  width: 100%;
  max-height: min(85dvh, 640px);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line);
  border-bottom: none;
  border-radius: 18px 18px 0 0;
  box-shadow: var(--shadow);
  padding-bottom: env(safe-area-inset-bottom);
  animation: addr-sheet-in 0.18s ease-out;
}

@media (min-width: 560px) {
  .addr-sheet {
    align-items: center;
    padding: 1rem;
  }

  .addr-sheet__panel {
    width: min(480px, 100%);
    border-bottom: 1px solid var(--line);
    border-radius: 18px;
  }
}

@keyframes addr-sheet-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .addr-sheet__panel {
    animation: none;
  }
}

.addr-sheet__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.1rem 1rem 0.85rem 1.15rem;
  border-bottom: 1px solid var(--line);
}

.addr-sheet__heading {
  min-width: 0;
}

.addr-sheet__title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 900;
  line-height: 1.2;
}

.addr-sheet__store {
  margin: 0.2rem 0 0;
  color: var(--muted);
  font-size: 0.9rem;
}

.addr-sheet__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  margin: -0.35rem -0.25rem 0 0;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--ink-2);
  cursor: pointer;
}

.addr-sheet__close svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.addr-sheet__close:hover {
  background: var(--bg);
}

.addr-sheet__list {
  margin: 0;
  padding: 0 1.15rem;
  list-style: none;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.addr-sheet__item {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding: 1rem 0;
}

.addr-sheet__item + .addr-sheet__item {
  border-top: 1px solid var(--line);
}

.addr-sheet__address {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin: 0;
  font-weight: 700;
  line-height: 1.35;
}

.addr-sheet__pin {
  flex: 0 0 auto;
  margin-top: 0.05rem;
  fill: none;
  stroke: var(--red);
  stroke-width: 1.8;
  stroke-linejoin: round;
}

.addr-sheet__actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.5rem;
}

.addr-sheet__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 44px;
  padding: 0 1rem;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--surface);
  color: var(--ink);
  font-weight: 800;
  text-decoration: none;
}

.addr-sheet__btn svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.addr-sheet__btn:hover {
  border-color: var(--ink-3);
  text-decoration: none;
}

.addr-sheet__btn--primary {
  border-color: var(--yellow);
  background: var(--yellow);
  color: var(--navy);
}

.addr-sheet__btn--primary:hover {
  border-color: var(--yellow);
  filter: brightness(1.05);
}

.addr-sheet__phones {
  display: flex;
  flex-direction: column;
  margin: -0.35rem 0 -0.5rem;
  padding: 0;
  list-style: none;
}

.addr-sheet__phone {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 1.25rem;
}

.addr-sheet__phone a {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 44px;
  font-weight: 700;
}

.addr-sheet__phone svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linejoin: round;
}

.addr-sheet__close:focus-visible,
.addr-sheet__btn:focus-visible,
.addr-sheet__phone a:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
}
</style>
