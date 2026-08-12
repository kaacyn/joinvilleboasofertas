import { describe, expect, it } from 'vitest'
import {
  filtersActiveCount,
  filtersFromQuery,
  filtersToApiParams,
} from '../app/composables/useOfferFilters'

describe('useOfferFilters helpers', () => {
  it('parseia query string', () => {
    const f = filtersFromQuery({
      q: 'arroz',
      category_ids: 'a,b',
      sort: 'price',
    })
    expect(f.q).toBe('arroz')
    expect(f.category_ids).toEqual(['a', 'b'])
    expect(f.sort).toBe('price')
  })

  it('monta params da API', () => {
    const params = filtersToApiParams({
      q: 'leite',
      category_ids: ['1'],
      establishment_ids: [],
      price_min: 2,
      price_max: null,
      sort: 'recent',
    })
    expect(params.q).toBe('leite')
    expect(params.category_ids).toBe('1')
    expect(params.price_min).toBe(2)
  })

  it('conta filtros ativos', () => {
    expect(filtersActiveCount({
      q: 'x',
      category_ids: ['1'],
      establishment_ids: [],
      price_min: null,
      price_max: 10,
      sort: 'recent',
    })).toBe(2)
  })
})
