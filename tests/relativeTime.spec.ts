import { afterEach, describe, expect, it } from 'vitest'
import { formatRegisteredAt } from '../app/utils/relativeTime'

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
