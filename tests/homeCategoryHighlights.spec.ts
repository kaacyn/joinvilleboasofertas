import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { JboOffer } from '../app/utils/jboApi'
import {
  HOME_CAROUSEL_LIMIT,
  HOME_CAROUSEL_PAGE_SIZE,
  HOME_CATEGORY_SLUGS,
  pickCategoryHighlights,
} from '../app/utils/homeVitrine'

const now = new Date('2026-09-11T15:00:00.000Z')

/** Oferta mínima vigente com economia, sobrescrevível por caso. */
function offer(over: Partial<JboOffer> & { id: string }): JboOffer {
  return {
    product_id: 'p', product_name: 'Produto', product_slug: 'produto',
    establishment_id: 'e', establishment_name: 'Loja', establishment_slug: 'loja',
    recorded_at: '2026-09-10T00:00:00Z', promo_starts_on: '2026-09-08', promo_ends_on: '2026-09-14',
    price: '9.99', diff_percent: -20,
    ...over,
  }
}

describe('HOME_CATEGORY_SLUGS', () => {
  it('carrosséis da home: mercearia, açougue, bebidas e hortifruti, nessa ordem', () => {
    expect(HOME_CATEGORY_SLUGS).toEqual(['mercearia', 'acougue', 'bebidas', 'hortifruti'])
  })
})

describe('pickCategoryHighlights', () => {
  it('mantém a ordem da API, fica só com promo vigente e respeita o limite', () => {
    const items = [
      offer({ id: 'a', diff_percent: -30 }),
      offer({ id: 'old', diff_percent: -50, promo_ends_on: '2026-09-01' }),
      offer({ id: 'soon', promo_starts_on: '2026-09-20', promo_ends_on: '2026-09-25' }),
      offer({ id: 'zero', diff_percent: 0 }),
      offer({ id: 'b', diff_percent: -10 }),
    ]
    expect(pickCategoryHighlights(items, 8, now).map(o => o.id)).toEqual(['a', 'zero', 'b'])
    expect(pickCategoryHighlights(items, 2, now).map(o => o.id)).toEqual(['a', 'zero'])
    expect(pickCategoryHighlights([], 8, now)).toEqual([])
  })

  it('mostra até 20 ofertas por carrossel quando o limite não é informado', () => {
    const items = Array.from({ length: 25 }, (_, i) => offer({ id: `o${i}` }))
    expect(HOME_CAROUSEL_LIMIT).toBe(20)
    expect(pickCategoryHighlights(items, undefined, now)).toHaveLength(20)
  })
})

describe('busca dos carrosséis na home', () => {
  it('pede à API mais que o limite (folga para promo que ainda não começou), dentro do teto de 50', () => {
    expect(HOME_CAROUSEL_PAGE_SIZE).toBeGreaterThan(HOME_CAROUSEL_LIMIT)
    expect(HOME_CAROUSEL_PAGE_SIZE).toBeLessThanOrEqual(50)
  })

  it('a home usa as constantes na chamada e no corte', () => {
    const home = readFileSync(resolve(import.meta.dirname, '..', 'app/pages/index.vue'), 'utf8')
    expect(home).toContain('page_size: HOME_CAROUSEL_PAGE_SIZE')
    expect(home).toContain('pickCategoryHighlights(page.items || [], HOME_CAROUSEL_LIMIT, now.value)')
  })
})
