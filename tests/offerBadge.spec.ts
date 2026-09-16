import { describe, expect, it } from 'vitest'
import { offerBadge, savingsPercent } from '../app/utils/offerBadge'

const now = new Date('2026-09-11T15:00:00.000Z')
const active = { promo_starts_on: '2026-09-08', promo_ends_on: '2026-09-14' }

describe('savingsPercent', () => {
  it('arredonda e devolve positivo só quando há economia', () => {
    expect(savingsPercent({ diff_percent: -28.4 })).toBe(28)
    expect(savingsPercent({ diff_percent: -0.4 })).toBe(0)
    expect(savingsPercent({ diff_percent: 12 })).toBe(0)
    expect(savingsPercent({ diff_percent: undefined })).toBe(0)
  })
})

describe('offerBadge', () => {
  it('expirado', () => {
    expect(offerBadge({ ...active, promo_ends_on: '2026-09-10', price: '10', diff_percent: -30 }, now))
      .toEqual({ kind: 'expired', label: 'EXPIRADO', club: false })
  })

  it('em breve', () => {
    expect(offerBadge({ promo_starts_on: '2026-09-20', promo_ends_on: '2026-09-25', price: '10', diff_percent: -30 }, now))
      .toEqual({ kind: 'upcoming', label: 'EM BREVE', club: false })
  })

  it('economia no preço regular', () => {
    expect(offerBadge({ ...active, price: '10', diff_percent: -28.4 }, now))
      .toEqual({ kind: 'savings', label: '-28%', club: false })
  })

  it('economia com preço de clube mostra só o desconto (sem tarja de clube)', () => {
    expect(offerBadge({ ...active, price: '12', club_price: '9.99', diff_percent: -28 }, now))
      .toEqual({ kind: 'savings', label: '-28%', club: false })
  })

  it('economia com programa da loja também mostra só o desconto', () => {
    expect(offerBadge({ ...active, price: '7.99', club_price: '4.99', diff_percent: -21.09, establishment_loyalty_program_name: 'Cooperado' }, now))
      .toEqual({ kind: 'savings', label: '-21%', club: false })
  })

  it('só clube sem economia não mostra badge na vitrine', () => {
    expect(offerBadge({ ...active, club_price: '9.99', diff_percent: 0, establishment_loyalty_program_name: 'Cooperado' }, now)).toBeNull()
    expect(offerBadge({ ...active, club_price: '9.99', diff_percent: 0 }, now)).toBeNull()
  })

  it('sem badge quando não há economia', () => {
    expect(offerBadge({ ...active, price: '10', diff_percent: 0 }, now)).toBeNull()
    expect(offerBadge({ ...active, price: '10', diff_percent: 5 }, now)).toBeNull()
  })
})
