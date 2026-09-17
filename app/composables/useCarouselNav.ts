import { onScopeDispose, ref, watch, type Ref } from 'vue'

/** Passo de cada seta: 80% da largura visível (fica um tile de contexto), nunca menos que um tile. */
export function carouselStep(clientWidth: number): number {
  return Math.max(Math.round(clientWidth * 0.8), 160)
}

/**
 * Onde o scroll para em cada slide, medido a partir do primeiro.
 * Usar a diferença entre os slides (e não offsetLeft) dispensa saber o padding
 * do trilho: em repouso scrollLeft é 0 e o primeiro slide vale 0.
 */
function slideStops(el: HTMLElement): number[] {
  const slides = Array.from(el.children) as HTMLElement[]
  const first = slides[0]
  if (!first) return []
  const origin = first.getBoundingClientRect().left
  return slides.map(slide => slide.getBoundingClientRect().left - origin)
}

/** Índice do slide cuja parada está mais perto da rolagem atual. */
function nearestStop(stops: number[], scrollLeft: number): number {
  let best = 0
  for (let i = 1; i < stops.length; i++) {
    const distance = Math.abs((stops[i] as number) - scrollLeft)
    if (distance < Math.abs((stops[best] as number) - scrollLeft)) best = i
  }
  return best
}

/**
 * Setas anterior/próxima e bolinhas de um carrossel com scroll nativo.
 * No toque e no trackpad o deslize já funciona; quem usa mouse não tem barra
 * (escondida) nem arraste, então precisa de botões que chamem `scrollBy`.
 * As bolinhas acompanham o scroll pelo slide mais próximo e levam até ele.
 */
export function useCarouselNav(list: Ref<HTMLElement | null>) {
  const canPrev = ref(false)
  const canNext = ref(false)
  const activeIndex = ref(0)

  /** Recalcula setas e bolinha ativa a partir da posição atual do scroll. */
  function update() {
    const el = list.value
    if (!el) {
      canPrev.value = false
      canNext.value = false
      activeIndex.value = 0
      return
    }
    const max = el.scrollWidth - el.clientWidth
    canPrev.value = el.scrollLeft > 1
    canNext.value = el.scrollLeft < max - 1
    activeIndex.value = nearestStop(slideStops(el), el.scrollLeft)
  }

  /** Rola quase uma página na direção pedida; o scroll-snap ajusta no tile. */
  function scrollByPage(dir: 1 | -1) {
    const el = list.value
    if (!el) return
    el.scrollBy({ left: dir * carouselStep(el.clientWidth), behavior: 'smooth' })
  }

  /** Rola até o slide de índice `index`; índice inexistente é ignorado. */
  function scrollToIndex(index: number) {
    const el = list.value
    if (!el) return
    const target = slideStops(el)[index]
    if (target == null) return
    el.scrollTo({ left: target, behavior: 'smooth' })
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

  return { canPrev, canNext, activeIndex, scrollByPage, scrollToIndex, update }
}
