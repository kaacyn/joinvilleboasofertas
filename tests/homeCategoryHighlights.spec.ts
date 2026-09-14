import { describe, expect, it } from 'vitest'
import type { JboOffer } from '../app/utils/jboApi'
import { HOME_CATEGORY_SLUGS, pickCategoryHighlights } from '../app/utils/homeVitrine'

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
})
