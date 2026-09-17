import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('HeroSavings', () => {
  const src = source('app/components/home/HeroSavings.vue')

  it('o rótulo do topo é "Maior economia do dia"', () => {
    expect(src).toContain('Maior economia do dia')
    expect(src).not.toContain('Maior economia da semana')
  })
})

describe('HeroCarousel', () => {
  const src = source('app/components/home/HeroCarousel.vue')

  it('um slide por oferta, com o card do hero dentro', () => {
    expect(src).toContain('v-for="offer in offers"')
    expect(src).toContain('<HeroSavings :offer="offer" />')
  })

  it('desliza com scroll-snap nativo, um slide inteiro por vez', () => {
    expect(src).toContain('scroll-snap-type: x mandatory')
    expect(src).toContain('scroll-snap-align: start')
    expect(src).toContain('flex: 0 0 100%')
  })

  it('reaproveita o composable de scroll dos outros carrosséis', () => {
    expect(src).toContain('useCarouselNav(trackRef)')
    expect(src).toContain('ref="trackRef"')
  })

  it('as bolinhas ficam abaixo do trilho, uma por oferta', () => {
    expect(src.indexOf('hero-car__dots')).toBeGreaterThan(src.indexOf('ref="trackRef"'))
    expect(src).toContain('v-for="(offer, index) in offers"')
  })

  it('clicar na bolinha leva ao slide e a ativa fica marcada', () => {
    expect(src).toContain('@click="scrollToIndex(index)"')
    expect(src).toContain('index === activeIndex')
    expect(src).toMatch(/:aria-current=/)
    expect(src).toMatch(/:aria-label="[^"]*Ver oferta/)
  })

  it('com uma única oferta não mostra bolinhas', () => {
    expect(src).toContain('v-if="offers.length > 1"')
  })
})

describe('home vitrine (topo)', () => {
  const src = source('app/pages/index.vue')

  it('o topo virou carrossel sorteado, não mais um hero fixo', () => {
    expect(src).toContain('<HeroCarousel :offers="heroOffers" />')
    expect(src).toContain('pickHeroRotation')
    expect(src).not.toContain('pickHero(')
  })

  it('pede um pool maior que os 5 slides para ter de onde sortear', () => {
    expect(src).toContain('page_size: HOME_HERO_PAGE_SIZE')
  })

  it('a semente do sorteio vive em useState, para SSR e hidratação sortearem igual', () => {
    expect(src).toMatch(/useState\(\s*'home:hero-seed'/)
  })
})
