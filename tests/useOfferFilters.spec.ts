import { describe, expect, it } from 'vitest'
import {
  filtersActiveCount,
  filtersFromQuery,
  filtersToApiParams,
  filtersToQuery,
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
      ends_today: false,
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
      ends_today: false,
    })).toBe(2)
  })

  it('lê ends_today=1 da query e ignora outros valores', () => {
    expect(filtersFromQuery({ ends_today: '1' }).ends_today).toBe(true)
    expect(filtersFromQuery({ ends_today: 'true' }).ends_today).toBe(true)
    expect(filtersFromQuery({ ends_today: '0' }).ends_today).toBe(false)
    expect(filtersFromQuery({}).ends_today).toBe(false)
  })

  it('escreve ends_today=1 só quando ativo', () => {
    const base = { q: '', category_ids: [], establishment_ids: [], price_min: null, price_max: null, sort: 'recent' }
    expect(filtersToQuery({ ...base, ends_today: true })).toEqual({ ends_today: '1' })
    expect(filtersToQuery({ ...base, ends_today: false })).toEqual({})
  })

  it('manda ends_today para a API e conta como filtro ativo', () => {
    const base = { q: '', category_ids: [], establishment_ids: [], price_min: null, price_max: null, sort: 'recent' }
    expect(filtersToApiParams({ ...base, ends_today: true }).ends_today).toBe(true)
    expect(filtersToApiParams({ ...base, ends_today: false }).ends_today).toBeUndefined()
    expect(filtersActiveCount({ ...base, ends_today: true })).toBe(1)
  })
})
