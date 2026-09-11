import { describe, expect, it } from 'vitest'
import type { OfferFiltersState } from '../app/composables/useOfferFilters'
import type { JboOffer } from '../app/utils/jboApi'
import { isRealSavings, isVitrineState, pickHero, pickTopSavings } from '../app/utils/homeVitrine'

const now = new Date('2026-09-11T15:00:00.000Z')

const vitrine: OfferFiltersState = {
  q: '', category_ids: [], establishment_ids: [], price_min: null, price_max: null, sort: 'recent', ends_today: false,
}

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

describe('isVitrineState', () => {
  it('é vitrine sem filtros e sort recent', () => {
    expect(isVitrineState(vitrine)).toBe(true)
  })

  it('qualquer filtro quebra a vitrine', () => {
    expect(isVitrineState({ ...vitrine, q: 'café' })).toBe(false)
    expect(isVitrineState({ ...vitrine, category_ids: ['1'] })).toBe(false)
    expect(isVitrineState({ ...vitrine, establishment_ids: ['1'] })).toBe(false)
    expect(isVitrineState({ ...vitrine, price_min: 1 })).toBe(false)
    expect(isVitrineState({ ...vitrine, price_max: 10 })).toBe(false)
    expect(isVitrineState({ ...vitrine, ends_today: true })).toBe(false)
    expect(isVitrineState({ ...vitrine, sort: 'savings' })).toBe(false)
  })
})

describe('isRealSavings / pickHero / pickTopSavings', () => {
  it('economia real exige promo vigente e diff negativo', () => {
    expect(isRealSavings(offer({ id: 'a' }), now)).toBe(true)
    expect(isRealSavings(offer({ id: 'b', diff_percent: 0 }), now)).toBe(false)
    expect(isRealSavings(offer({ id: 'c', promo_ends_on: '2026-09-10' }), now)).toBe(false)
    expect(isRealSavings(offer({ id: 'd', promo_starts_on: '2026-09-20', promo_ends_on: '2026-09-25' }), now)).toBe(false)
  })

  it('hero é o primeiro item com economia real; null se nenhum', () => {
    const items = [offer({ id: 'x', diff_percent: 0 }), offer({ id: 'y', diff_percent: -30 }), offer({ id: 'z' })]
    expect(pickHero(items, now)?.id).toBe('y')
    expect(pickHero([offer({ id: 'x', diff_percent: 0 })], now)).toBeNull()
    expect(pickHero([], now)).toBeNull()
  })

  it('carrossel exclui o hero, ignora sem economia e expiradas e respeita o limite', () => {
    const items = [
      offer({ id: 'hero', diff_percent: -40 }),
      offer({ id: 'a', diff_percent: -30 }),
      offer({ id: 'zero', diff_percent: 0 }),
      offer({ id: 'old', diff_percent: -50, promo_ends_on: '2026-09-01' }),
      offer({ id: 'b', diff_percent: -10 }),
      offer({ id: 'c', diff_percent: -5 }),
    ]
    expect(pickTopSavings(items, 'hero', 8, now).map(o => o.id)).toEqual(['a', 'b', 'c'])
    expect(pickTopSavings(items, 'hero', 2, now).map(o => o.id)).toEqual(['a', 'b'])
    expect(pickTopSavings(items, null, 8, now).map(o => o.id)).toEqual(['hero', 'a', 'b', 'c'])
  })
})
