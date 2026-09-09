import { afterEach, describe, expect, it } from 'vitest'
import {
  formatCivilDate,
  formatExpiredOn,
  formatPromoEndLabel,
  formatRegisteredAt,
  formatValidUntil,
} from '../app/utils/relativeTime'

const now = new Date('2026-08-17T13:00:00.000Z')
const runtimeTimeZone = process.env.TZ

describe('formatRegisteredAt', () => {
  afterEach(() => {
    if (runtimeTimeZone === undefined) delete process.env.TZ
    else process.env.TZ = runtimeTimeZone
  })

  it.each([
    ['2026-08-17T12:59:31.000Z', 'Cadastrado agora'],
    ['2026-08-17T12:59:00.000Z', 'Cadastrado há 1 minuto'],
    ['2026-08-17T12:55:00.000Z', 'Cadastrado há 5 minutos'],
    ['2026-08-17T12:00:00.000Z', 'Cadastrado há 1 hora'],
    ['2026-08-17T08:00:00.000Z', 'Cadastrado há 5 horas'],
    ['2026-08-16T13:00:00.000Z', 'Cadastrado há 1 dia'],
    ['2026-08-15T13:00:00.000Z', 'Cadastrado há 2 dias'],
    ['2026-07-18T13:00:00.000Z', 'Cadastrado em 18/07/2026'],
  ])('formata %s', (iso, expected) => {
    expect(formatRegisteredAt(iso, now)).toBe(expected)
  })

  it.each(['UTC', 'Asia/Tokyo'])(
    'usa a data civil brasileira mesmo com o runtime em %s',
    (timeZone) => {
      process.env.TZ = timeZone

      expect(formatRegisteredAt('2026-01-01T02:00:00.000Z', now)).toBe('Cadastrado em 31/12/2025')
    },
  )
})

describe('validade relativa de promoções', () => {
  afterEach(() => {
    if (runtimeTimeZone === undefined) delete process.env.TZ
    else process.env.TZ = runtimeTimeZone
  })

  it.each([
    ['2026-08-17', 'hoje'],
    ['2026-08-18', 'amanhã'],
    ['2026-08-19', 'quarta-feira'],
    ['2026-08-23', 'domingo'],
    ['2026-08-24', '24/08/2026'],
    ['2026-09-01', '01/09/2026'],
  ])('formatPromoEndLabel(%s)', (endOn, expected) => {
    expect(formatPromoEndLabel(endOn, now)).toBe(expected)
  })

  it.each([
    ['2026-08-17', 'Válido até hoje'],
    ['2026-08-18', 'Válido até amanhã'],
    ['2026-08-21', 'Válido até sexta-feira'],
    ['2026-08-24', 'Válido até 24/08/2026'],
  ])('formatValidUntil(%s)', (endOn, expected) => {
    expect(formatValidUntil(endOn, now)).toBe(expected)
  })

  it.each([
    ['2026-08-16', 'Expirou ontem'],
    ['2026-08-15', 'Expirou no sábado'],
    ['2026-08-10', 'Expirou em 10/08/2026'],
  ])('formatExpiredOn(%s)', (endOn, expected) => {
    expect(formatExpiredOn(endOn, now)).toBe(expected)
  })

  it('formata ISO e data civil brasileira', () => {
    expect(formatCivilDate('2026-01-15')).toBe('15/01/2026')
    expect(formatCivilDate('15/01/2026')).toBe('15/01/2026')
  })

  it.each(['UTC', 'Asia/Tokyo'])(
    'mantém o dia civil brasileiro com runtime em %s',
    (timeZone) => {
      process.env.TZ = timeZone
      expect(formatValidUntil('2026-08-18', now)).toBe('Válido até amanhã')
    },
  )
})
