<template>
  <div ref="rootRef" class="chipdd">
    <button
      ref="triggerRef"
      type="button"
      class="chipdd__trigger"
      :class="{ 'chipdd__trigger--active': activeCount > 0 }"
      :aria-expanded="open"
      aria-haspopup="true"
      @click="toggle"
    >
      <span>{{ label }}</span>
      <span v-if="activeCount > 0" class="chipdd__badge">{{ activeCount }}</span>
      <span class="chipdd__caret" aria-hidden="true">▾</span>
    </button>

    <Teleport to="body">
      <div
        v-show="open"
        ref="panelRef"
        class="chipdd__panel"
        :style="panelStyle"
        role="dialog"
      >
        <slot :close="close" />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  activeCount?: number
}>(), {
  activeCount: 0,
})

const emit = defineEmits<{
  open: []
  close: []
}>()

const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const open = ref(false)

const PANEL_WIDTH = 280
const SCREEN_MARGIN = 8

const panelStyle = ref<Record<string, string>>(hiddenStyle())

/**
 * Estilo inicial: fora da tela até haver âncora no trigger.
 */
function hiddenStyle(): Record<string, string> {
  return {
    position: 'fixed',
    top: '0px',
    left: '0px',
    width: `${PANEL_WIDTH}px`,
    visibility: 'hidden',
    pointerEvents: 'none',
  }
}

/**
 * Alterna abertura do dropdown.
 */
function toggle() {
  if (open.value) close()
  else openPanel()
}

/**
 * Posição fixed alinhada à borda inferior do botão.
 */
function positionFromTrigger(): Record<string, string> {
  const trigger = triggerRef.value
  if (!trigger) return hiddenStyle()

  const rect = trigger.getBoundingClientRect()
  const maxLeft = window.innerWidth - PANEL_WIDTH - SCREEN_MARGIN
  const left = Math.max(SCREEN_MARGIN, Math.min(rect.left, maxLeft))
  const top = rect.bottom + 6

  return {
    position: 'fixed',
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    width: `${PANEL_WIDTH}px`,
    visibility: 'visible',
    pointerEvents: 'auto',
    zIndex: '1000',
  }
}

/**
 * Atualiza o estilo do painel a partir do trigger.
 */
function computePosition() {
  panelStyle.value = positionFromTrigger()
}

/**
 * Abre o painel já ancorado — evita o primeiro paint no fim do body.
 */
function openPanel() {
  computePosition()
  open.value = true
  emit('open')
  requestAnimationFrame(() => {
    computePosition()
    requestAnimationFrame(computePosition)
  })
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('touchstart', onDocClick, { passive: true })
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onWindowScroll, true)
}

/**
 * Fecha o painel e remove listeners.
 */
function close() {
  if (!open.value) return
  open.value = false
  panelStyle.value = hiddenStyle()
  emit('close')
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('touchstart', onDocClick)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onWindowScroll, true)
}

/**
 * Reposiciona no resize (teclado virtual no mobile).
 */
function onViewportChange() {
  if (open.value) computePosition()
}

/**
 * Fecha no scroll da página, mas não no scroll interno do painel.
 */
function onWindowScroll(e: Event) {
  const panel = panelRef.value
  const target = e.target as Node | null
  if (panel && target && (target === panel || panel.contains(target))) return
  close()
}

/**
 * Fecha ao clicar fora do trigger e do painel.
 */
function onDocClick(e: Event) {
  const t = e.target as Node
  const insideTrigger = !!(rootRef.value && rootRef.value.contains(t))
  const insidePanel = !!(panelRef.value && panelRef.value.contains(t))
  if (!insideTrigger && !insidePanel) close()
}

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('touchstart', onDocClick)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onWindowScroll, true)
})
</script>

<style scoped>
.chipdd {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.chipdd__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 14px;
  background: transparent;
  border: none;
  border-radius: 0;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  white-space: nowrap;
}

.chipdd__trigger--active {
  color: var(--yellow);
  font-weight: 800;
}

.chipdd__badge {
  background: var(--yellow);
  color: var(--navy);
  font-size: 0.7rem;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 999px;
  min-width: 18px;
  text-align: center;
}

.chipdd__caret {
  font-size: 0.7rem;
}
</style>

<style>
/* Painel teleportado para body — precisa de CSS global. */
.chipdd__panel {
  position: fixed;
  display: flex;
  flex-direction: column;
  background: var(--navy-light, #151d2b);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  padding: 12px;
  max-height: 360px;
  overflow-x: hidden;
  overflow-y: hidden;
  z-index: 1000;
  color: #fff;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.chipdd__panel::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}
</style>
