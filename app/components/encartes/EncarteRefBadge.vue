<template>
  <button
    v-if="code"
    type="button"
    class="ref"
    :class="{ 'ref--copied': copied }"
    :title="copied ? 'Copiado' : `Copiar código ${code}`"
    :aria-label="copied ? `Código ${code} copiado` : `Copiar código ${code}`"
    @click.stop="copy"
  >
    {{ copied ? 'Copiado' : code }}
  </button>
</template>

<script setup lang="ts">
import { encarteRefCode } from '~/utils/encarteRef'

const props = defineProps<{ scanId?: string | null }>()

const code = computed(() => encarteRefCode(props.scanId))
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

/**
 * Copia o código curto para a área de transferência.
 */
async function copy() {
  if (!code.value || typeof navigator === 'undefined') return
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(code.value)
    }
    else {
      const ta = document.createElement('textarea')
      ta.value = code.value
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  }
  catch {
    return
  }
  copied.value = true
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copied.value = false
  }, 1600)
}

onBeforeUnmount(() => {
  clearTimeout(copiedTimer)
})
</script>

<style scoped>
.ref {
  position: absolute;
  right: 0.45rem;
  bottom: 0.45rem;
  z-index: 3;
  margin: 0;
  padding: 0.12rem 0.38rem;
  border: 0;
  border-radius: 6px;
  background: rgba(6, 10, 16, 0.72);
  color: rgba(255, 255, 255, 0.86);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.2;
  cursor: pointer;
  user-select: text;
  -webkit-user-select: text;
}

.ref:hover,
.ref:focus-visible {
  background: rgba(6, 10, 16, 0.9);
  color: var(--yellow, #ffc800);
}

.ref:focus-visible {
  outline: 2px solid var(--yellow, #ffc800);
  outline-offset: 2px;
}

.ref--copied {
  color: var(--yellow, #ffc800);
}
</style>
