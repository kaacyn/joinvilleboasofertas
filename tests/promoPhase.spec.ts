import { describe, expect, it } from 'vitest'

import {
  formatPromoValidityLabel,
  getPromoPhase,
  isEndingToday,
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

  it('rotula Termina hoje quando a promo vence na data civil de hoje', () => {
    const offer = { promo_starts_on: '2026-08-15', promo_ends_on: '2026-08-19' }
    expect(isEndingToday(offer, now)).toBe(true)
    expect(formatPromoValidityLabel(offer, now)).toBe('Termina hoje')
  })

  it('usa a data civil de São Paulo, não o UTC', () => {
    const lateNightUtc = new Date('2026-08-20T01:00:00.000Z') // 22h do dia 19 em Joinville
    const offer = { promo_ends_on: '2026-08-19' }
    expect(isEndingToday(offer, lateNightUtc)).toBe(true)
  })

  it('não é Termina hoje quando vence amanhã, já venceu ou ainda não começou', () => {
    expect(isEndingToday({ promo_ends_on: '2026-08-20' }, now)).toBe(false)
    expect(formatPromoValidityLabel({ promo_ends_on: '2026-08-20' }, now)).toBe('Válido até amanhã')
    expect(isEndingToday({ promo_ends_on: '2026-08-18' }, now)).toBe(false)
    expect(isEndingToday({ promo_starts_on: '2026-08-25', promo_ends_on: '2026-08-25' }, now)).toBe(false)
    expect(isEndingToday({ promo_ends_on: null }, now)).toBe(false)
  })
})
