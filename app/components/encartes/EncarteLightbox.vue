<template>
  <div
    class="lb"
    role="dialog"
    aria-modal="true"
    aria-label="Encarte ampliado"
    @click.self="emit('close')"
  >
    <button
      ref="closeButton"
      type="button"
      class="lb__close"
      aria-label="Fechar"
      @click="emit('close')"
    >
      ×
    </button>
    <img
      v-if="encarte.image_url_xl || encarte.image_url"
      class="lb__img"
      :src="encarte.image_url_xl || encarte.image_url || ''"
      :alt="`Encarte ${encarte.establishment_name}`"
    >
    <p v-else class="lb__empty">Imagem indisponível.</p>
  </div>
</template>

<script setup lang="ts">
import type { JboEncarte } from '~/utils/jboApi'

defineProps<{ encarte: JboEncarte }>()
const emit = defineEmits<{ close: [] }>()
const closeButton = ref<HTMLButtonElement | null>(null)
let previousOverflow = ''

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', onKey)
  closeButton.value?.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = previousOverflow
})
</script>

<style scoped>
.lb {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 3.5rem 1rem 1rem;
  background: rgba(4, 8, 13, 0.92);
}

.lb__close {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  background: var(--navy-light);
  color: var(--white);
  font-size: 1.8rem;
  line-height: 1;
  cursor: pointer;
}

.lb__close:hover,
.lb__close:focus-visible {
  border-color: var(--yellow);
  color: var(--yellow);
}

.lb__close:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
}

.lb__img {
  max-width: min(100%, 1100px);
  max-height: calc(100vh - 4.5rem);
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.55);
}

.lb__empty {
  color: var(--muted);
}
</style>
