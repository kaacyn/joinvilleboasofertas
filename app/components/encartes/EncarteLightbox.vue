<template>
  <div
    ref="overlay"
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
    <div v-if="encarte.image_url_xl || encarte.image_url" class="lb__frame">
      <img
        class="lb__img"
        :src="encarte.image_url_xl || encarte.image_url || ''"
        :alt="`Encarte ${encarte.establishment_name}`"
      >
      <div
        v-if="highlightStyle"
        class="lb__highlight"
        :style="highlightStyle"
        aria-hidden="true"
      />
      <button
        v-for="spot in visibleHotspots"
        :key="spot.id"
        type="button"
        class="lb__hotspot"
        :class="{ 'lb__hotspot--active': spot.id === activeId }"
        :style="boxStyle(spot.bbox)"
        :aria-label="spot.label"
        :title="spot.label"
        @click="emit('select', spot.id)"
      />
      <EncarteRefBadge :scan-id="encarte.id" />
    </div>
    <p v-else class="lb__empty">Imagem indisponível.</p>
    <p v-if="hint" class="lb__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import type { JboBbox, JboEncarte } from '~/utils/jboApi'

/** Área clicável sobre a foto que leva a uma oferta. */
export type EncarteHotspot = {
  id: string
  bbox: JboBbox
  label: string
}

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]'

const props = withDefaults(defineProps<{
  encarte: JboEncarte
  /** Caixa (0..1) a realçar na foto — o restante fica escurecido. */
  highlight?: JboBbox | null
  /** Ofertas clicáveis sobre a foto. */
  hotspots?: EncarteHotspot[]
  /** Id da oferta cujo hotspot aparece destacado. */
  activeId?: string | null
}>(), {
  highlight: null,
  hotspots: () => [],
  activeId: null,
})
const emit = defineEmits<{ close: [], select: [id: string] }>()
const overlay = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
let previouslyFocused: HTMLElement | null = null
let previousOverflow = ''

/** Limita a fração ao intervalo [0, 1]. */
function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, Number(value) || 0))
}

/** True quando a caixa tem área útil dentro da foto. */
function isUsableBox(box: JboBbox | null | undefined): box is JboBbox {
  return Boolean(box) && clampUnit(box!.w) > 0 && clampUnit(box!.h) > 0
}

/** Posição absoluta em porcentagem relativa à foto. */
function boxStyle(box: JboBbox): Record<string, string> {
  const x = clampUnit(box.x)
  const y = clampUnit(box.y)
  const w = Math.min(clampUnit(box.w), 1 - x)
  const h = Math.min(clampUnit(box.h), 1 - y)
  return {
    left: `${(x * 100).toFixed(2)}%`,
    top: `${(y * 100).toFixed(2)}%`,
    width: `${(w * 100).toFixed(2)}%`,
    height: `${(h * 100).toFixed(2)}%`,
  }
}

const highlightStyle = computed(() =>
  isUsableBox(props.highlight) ? boxStyle(props.highlight) : null,
)
const visibleHotspots = computed(() =>
  (props.hotspots || []).filter(spot => isUsableBox(spot.bbox)),
)
const hint = computed(() => {
  if (highlightStyle.value) return 'A oferta está destacada na foto. Confira as condições no encarte.'
  if (visibleHotspots.value.length) return 'Toque numa oferta na foto para ver os detalhes.'
  return ''
})

/** Focáveis do diálogo, na ordem do DOM. */
function focusableItems(): HTMLElement[] {
  const nodes = overlay.value?.querySelectorAll<HTMLElement>(FOCUSABLE)
  return Array.from(nodes || []).filter(
    el => !el.hasAttribute('disabled') && el.getAttribute('tabindex') !== '-1',
  )
}

/** Faz Tab e Shift+Tab circularem apenas dentro do diálogo. */
function trapTab(e: KeyboardEvent) {
  const items = focusableItems()
  if (!items.length) {
    e.preventDefault()
    return
  }

  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement as HTMLElement | null

  if (!active || !overlay.value?.contains(active)) {
    e.preventDefault()
    first.focus()
  }
  else if (e.shiftKey && active === first) {
    e.preventDefault()
    last.focus()
  }
  else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
    return
  }
  if (e.key === 'Tab') trapTab(e)
}

onBeforeMount(() => {
  previouslyFocused = document.activeElement as HTMLElement | null
})

onMounted(() => {
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', onKey)
  closeButton.value?.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = previousOverflow
  previouslyFocused?.focus()
})
</script>

<style scoped>
.lb {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 0.6rem;
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
  background: var(--navy-2);
  color: var(--on-dark);
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

/* O frame abraça exatamente a imagem: as caixas em % ficam alinhadas à foto. */
.lb__frame {
  position: relative;
  display: inline-block;
  max-width: min(100%, 1100px);
  max-height: calc(100vh - 6rem);
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.55);
}

.lb__img {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: calc(100vh - 6rem);
  object-fit: contain;
}

.lb__highlight {
  position: absolute;
  border: 3px solid var(--yellow);
  border-radius: 8px;
  box-shadow: 0 0 0 9999px rgba(4, 8, 13, 0.55);
  pointer-events: none;
}

.lb__hotspot {
  position: absolute;
  margin: 0;
  padding: 0;
  border: 2px dashed rgba(255, 200, 0, 0.55);
  border-radius: 6px;
  background: rgba(255, 200, 0, 0.06);
  cursor: pointer;
}

.lb__hotspot:hover,
.lb__hotspot:focus-visible,
.lb__hotspot--active {
  border-style: solid;
  border-color: var(--yellow);
  background: rgba(255, 200, 0, 0.16);
  outline: none;
}

.lb__empty,
.lb__hint {
  margin: 0;
  color: var(--muted);
  font-size: 0.85rem;
  text-align: center;
}
</style>
