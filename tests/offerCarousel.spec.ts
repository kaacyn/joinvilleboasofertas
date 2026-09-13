import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { effectScope, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { carouselStep, useCarouselNav } from '../app/composables/useCarouselNav'

const root = resolve(import.meta.dirname, '..')

function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

/** Div com as medidas de um carrossel (happy-dom não faz layout). */
function fakeList(over: { clientWidth?: number, scrollWidth?: number, scrollLeft?: number } = {}) {
  const el = document.createElement('div')
  Object.defineProperty(el, 'clientWidth', { value: over.clientWidth ?? 720, configurable: true })
  Object.defineProperty(el, 'scrollWidth', { value: over.scrollWidth ?? 1364, configurable: true })
  Object.defineProperty(el, 'scrollLeft', { value: over.scrollLeft ?? 0, writable: true, configurable: true })
  Object.defineProperty(el, 'scrollBy', { value: vi.fn(), configurable: true })
  return el as HTMLElement & { scrollBy: ReturnType<typeof vi.fn> }
}

describe('useCarouselNav (setas do carrossel no desktop)', () => {
  let dispose: (() => void) | undefined

  afterEach(() => {
    dispose?.()
    dispose = undefined
  })

  function setup(el: HTMLElement | null) {
    const list = ref<HTMLElement | null>(el)
    const scope = effectScope()
    const nav = scope.run(() => useCarouselNav(list))!
    dispose = () => scope.stop()
    return { list, nav }
  }

  it('no início só "próxima" está disponível; no fim só "anterior"', async () => {
    const el = fakeList()
    const { nav } = setup(el)
    await nextTick()
    expect(nav.canPrev.value).toBe(false)
    expect(nav.canNext.value).toBe(true)

    el.scrollLeft = 1364 - 720
    el.dispatchEvent(new Event('scroll'))
    expect(nav.canPrev.value).toBe(true)
    expect(nav.canNext.value).toBe(false)

    el.scrollLeft = 300
    el.dispatchEvent(new Event('scroll'))
    expect(nav.canPrev.value).toBe(true)
    expect(nav.canNext.value).toBe(true)
  })

  it('sem overflow (poucos tiles) as duas setas ficam desativadas', async () => {
    const { nav } = setup(fakeList({ scrollWidth: 720 }))
    await nextTick()
    expect(nav.canPrev.value).toBe(false)
    expect(nav.canNext.value).toBe(false)
  })

  it('sem elemento (SSR) as duas setas ficam desativadas e scrollByPage não quebra', async () => {
    const { nav } = setup(null)
    await nextTick()
    expect(nav.canPrev.value).toBe(false)
    expect(nav.canNext.value).toBe(false)
    expect(() => nav.scrollByPage(1)).not.toThrow()
  })

  it('scrollByPage rola quase uma página, suave, na direção pedida', async () => {
    const el = fakeList()
    const { nav } = setup(el)
    await nextTick()

    nav.scrollByPage(1)
    expect(el.scrollBy).toHaveBeenLastCalledWith({ left: carouselStep(720), behavior: 'smooth' })

    nav.scrollByPage(-1)
    expect(el.scrollBy).toHaveBeenLastCalledWith({ left: -carouselStep(720), behavior: 'smooth' })
  })

  it('carouselStep: 80% da largura visível, nunca menos que um tile', () => {
    expect(carouselStep(720)).toBe(576)
    expect(carouselStep(100)).toBe(160)
  })

  it('para de escutar o scroll quando o escopo é encerrado', async () => {
    const el = fakeList()
    const { nav } = setup(el)
    await nextTick()
    dispose?.()
    dispose = undefined

    el.scrollLeft = 300
    el.dispatchEvent(new Event('scroll'))
    expect(nav.canPrev.value).toBe(false)
  })
})

describe('OfferCarousel', () => {
  const src = source('app/components/home/OfferCarousel.vue')

  it('setas anterior/próxima sempre presentes, desativadas nas pontas, só para mouse (hover + pointer fine)', () => {
    expect(src).toContain('useCarouselNav(listRef)')
    expect(src).toContain('ref="listRef"')
    expect(src).toContain(':disabled="!canPrev"')
    expect(src).toContain(':disabled="!canNext"')
    expect(src).not.toContain('v-show=')
    expect(src).toContain('@click="scrollByPage(-1)"')
    expect(src).toContain('@click="scrollByPage(1)"')
    expect(src).toContain('aria-label="Ofertas anteriores"')
    expect(src).toContain('aria-label="Próximas ofertas"')
    expect(src).toContain('@media (hover: hover) and (pointer: fine)')
  })

  it('setas ladeiam a lista (colunas do grid), não ficam sobre os tiles', () => {
    expect(src).toContain('grid-template-columns: auto minmax(0, 1fr) auto')
    expect(src).not.toContain('position: absolute')
    expect(src.indexOf('hcar__nav--prev')).toBeLessThan(src.indexOf('class="hlist"'))
    expect(src.indexOf('hcar__nav--next')).toBeGreaterThan(src.indexOf('class="hlist"'))
  })

  it('tom vivo quando ativa e apagado quando desativada', () => {
    expect(src).toMatch(/\.hcar__nav\s*\{[^}]*background: var\(--navy\)/)
    expect(src).toMatch(/\.hcar__nav:disabled\s*\{[^}]*color: var\(--ink-3\)/)
  })

  it('snap alinhado ao padding lateral (mesma variável no padding e no scroll-padding)', () => {
    expect(src).toContain('padding: 0 var(--pad)')
    expect(src).toContain('scroll-padding-inline: var(--pad)')
  })
})
