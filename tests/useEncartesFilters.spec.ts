import { describe, expect, it } from 'vitest'
import {
  encartesFiltersFromQuery,
  encartesFiltersToQuery,
  establishmentIdsFromQuery,
} from '../app/composables/useEncartesFilters'

describe('useEncartesFilters helpers', () => {
  it('parseia establishment_ids da query', () => {
    expect(establishmentIdsFromQuery({})).toEqual([])
    expect(establishmentIdsFromQuery({
      establishment_ids: 'a,b',
    })).toEqual(['a', 'b'])
    expect(establishmentIdsFromQuery({
      establishment_ids: ' a , b , ',
    })).toEqual(['a', 'b'])
  })

  it('parseia sort da query com cadastro como padrão', () => {
    expect(encartesFiltersFromQuery({}).sort).toBe('created')
    expect(encartesFiltersFromQuery({ sort: 'ends' }).sort).toBe('ends')
    expect(encartesFiltersFromQuery({ sort: 'price' }).sort).toBe('created')
  })

  it('monta query da URL com lojas e ordenação', () => {
    expect(encartesFiltersToQuery({
      establishmentIds: [],
      sort: 'created',
    })).toEqual({})
    expect(encartesFiltersToQuery({
      establishmentIds: ['x', 'y'],
      sort: 'ends',
    })).toEqual({
      establishment_ids: 'x,y',
      sort: 'ends',
    })
  })
})
