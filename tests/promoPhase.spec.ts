import { describe, expect, it } from 'vitest'

import {
  formatPromoValidityLabel,
  getPromoPhase,
  isPromoExpired,
  isPromoUpcoming,
} from '../app/utils/promoPhase'

const now = new Date('2026-08-19T15:00:00.000Z')

describe('promoPhase', () => {
  it('identifica promoção que ainda não começou', () => {
    const offer = { promo_starts_on: '2026-08-20', promo_ends_on: '2026-09-02' }
    expect(getPromoPhase(offer, now)).toBe('upcoming')
    expect(isPromoUpcoming(offer, now)).toBe(true)
    expect(isPromoExpired(offer, now)).toBe(false)
  })

  it('identifica promoção expirada', () => {
    const offer = { promo_starts_on: '2026-08-01', promo_ends_on: '2026-08-18' }
    expect(getPromoPhase(offer, now)).toBe('expired')
    expect(isPromoExpired(offer, now)).toBe(true)
  })

  it('identifica promoção vigente', () => {
    const offer = { promo_starts_on: '2026-08-18', promo_ends_on: '2026-09-02' }
    expect(getPromoPhase(offer, now)).toBe('active')
  })

  it('não rotula em breve como expirado no texto de validade', () => {
    const offer = { promo_starts_on: '2026-08-20', promo_ends_on: '2026-09-02' }
    expect(formatPromoValidityLabel(offer, now)).toBe(
      'A partir de 20/08/2026 · válido até 02/09/2026',
    )
  })
})
