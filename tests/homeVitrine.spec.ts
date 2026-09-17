import { describe, expect, it } from 'vitest'
import type { OfferFiltersState } from '../app/composables/useOfferFilters'
import type { JboOffer } from '../app/utils/jboApi'
import { HOME_HERO_LIMIT, isRealSavings, isVitrineState, pickHeroRotation } from '../app/utils/homeVitrine'

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

/** Pool de 8 ofertas vigentes, da maior para a menor economia. */
function pool(): JboOffer[] {
  return ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    .map((id, i) => offer({ id, diff_percent: -(50 - i) }))
}

/** Ids devolvidos pelo sorteio, na ordem em que aparecem. */
function rotationIds(items: JboOffer[], seed: number, limit = HOME_HERO_LIMIT): string[] {
  return pickHeroRotation(items, seed, limit, now).map(o => o.id)
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

describe('isRealSavings', () => {
  it('economia real exige promo vigente e diff negativo', () => {
    expect(isRealSavings(offer({ id: 'a' }), now)).toBe(true)
    expect(isRealSavings(offer({ id: 'b', diff_percent: 0 }), now)).toBe(false)
    expect(isRealSavings(offer({ id: 'c', promo_ends_on: '2026-09-10' }), now)).toBe(false)
    expect(isRealSavings(offer({ id: 'd', promo_starts_on: '2026-09-20', promo_ends_on: '2026-09-25' }), now)).toBe(false)
  })
})

describe('pickHeroRotation', () => {
  it('o carrossel do hero mostra 5 ofertas', () => {
    expect(HOME_HERO_LIMIT).toBe(5)
    expect(pickHeroRotation(pool(), 42, undefined, now)).toHaveLength(5)
  })

  it('a mesma semente devolve sempre a mesma seleção e a mesma ordem', () => {
    expect(rotationIds(pool(), 123)).toEqual(rotationIds(pool(), 123))
  })

  it('sementes diferentes variam a seleção', () => {
    const ordens = new Set(Array.from({ length: 10 }, (_, seed) => rotationIds(pool(), seed).join('|')))
    expect(ordens.size).toBeGreaterThan(1)
  })

  it('sorteia do pool inteiro, não só das primeiras do ranking', () => {
    const vistas = new Set<string>()
    for (let seed = 0; seed < 30; seed++) rotationIds(pool(), seed).forEach(id => vistas.add(id))
    expect(vistas.size).toBe(pool().length)
  })

  it('não repete oferta e só devolve itens do pool', () => {
    const ids = rotationIds(pool(), 7)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every(id => pool().some(o => o.id === id))).toBe(true)
  })

  it('ignora sem economia, expirada e ainda não iniciada', () => {
    const items = [
      offer({ id: 'ok' }),
      offer({ id: 'zero', diff_percent: 0 }),
      offer({ id: 'velha', diff_percent: -50, promo_ends_on: '2026-09-01' }),
      offer({ id: 'futura', diff_percent: -50, promo_starts_on: '2026-09-20', promo_ends_on: '2026-09-25' }),
    ]
    expect(rotationIds(items, 3)).toEqual(['ok'])
  })

  it('pool vazio devolve lista vazia', () => {
    expect(pickHeroRotation([], 1, HOME_HERO_LIMIT, now)).toEqual([])
  })
})
