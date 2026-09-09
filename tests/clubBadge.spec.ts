import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CLUB_LABEL,
  clubBadgeLabel,
  clubPriceHint,
} from '../app/utils/jboApi'

describe('clubBadgeLabel', () => {
  it('returns empty when not club price', () => {
    expect(clubBadgeLabel({ is_club_price: false })).toBe('')
  })

  it('returns program name when configured', () => {
    expect(clubBadgeLabel({
      is_club_price: true,
      establishment_loyalty_program_name: 'Cooperado',
    })).toBe('Cooperado')
  })

  it('falls back to Clube when program name is missing', () => {
    expect(clubBadgeLabel({
      is_club_price: true,
      establishment_loyalty_program_name: '',
    })).toBe(DEFAULT_CLUB_LABEL)
  })
})

describe('clubPriceHint', () => {
  it('uses default wording for generic club', () => {
    expect(clubPriceHint({ is_club_price: true })).toBe('Preço de clube')
  })

  it('uses program name in hint', () => {
    expect(clubPriceHint({
      is_club_price: true,
      establishment_loyalty_program_name: 'Cooperado',
    })).toBe('Preço cooperado')
  })
})
