import { onScopeDispose, ref, watch, type Ref } from 'vue'

/** Passo de cada seta: 80% da largura visível (fica um tile de contexto), nunca menos que um tile. */
export function carouselStep(clientWidth: number): number {
  return Math.max(Math.round(clientWidth * 0.8), 160)
}

/**
 * Setas anterior/próxima de um carrossel com scroll nativo.
 * No toque e no trackpad o deslize já funciona; quem usa mouse não tem barra
 * (escondida) nem arraste, então precisa de botões que chamem `scrollBy`.
 */
export function useCarouselNav(list: Ref<HTMLElement | null>) {
  const canPrev = ref(false)
  const canNext = ref(false)

  /** Recalcula as setas a partir da posição atual do scroll. */
  function update() {
    const el = list.value
    if (!el) {
      canPrev.value = false
      canNext.value = false
      return
    }
    const max = el.scrollWidth - el.clientWidth
    canPrev.value = el.scrollLeft > 1
    canNext.value = el.scrollLeft < max - 1
  }

  /** Rola quase uma página na direção pedida; o scroll-snap ajusta no tile. */
  function scrollByPage(dir: 1 | -1) {
    const el = list.value
    if (!el) return
    el.scrollBy({ left: dir * carouselStep(el.clientWidth), behavior: 'smooth' })
  }

  let bound: HTMLElement | null = null
  let observer: ResizeObserver | null = null

  function detach() {
    bound?.removeEventListener('scroll', update)
    observer?.disconnect()
    bound = null
    observer = null
  }

  watch(list, (el) => {
    detach()
    if (el) {
      bound = el
      el.addEventListener('scroll', update, { passive: true })
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(update)
        observer.observe(el)
      }
    }
    update()
  }, { immediate: true, flush: 'post' })

  onScopeDispose(detach)

  return { canPrev, canNext, scrollByPage, update }
}
