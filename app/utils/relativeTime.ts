/** Fuso fixo para a data civil não variar com o timezone do runtime (SSR ou browser). */
const CIVIL_DATE = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })
const CIVIL_ISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
const WEEKDAY = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  weekday: 'long',
})

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const RELATIVE_PROMO_DAYS = 6

type DateParts = { y: number, m: number, d: number }

function unit(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`
}

/** Interpreta `YYYY-MM-DD` ou `DD/MM/YYYY`. */
export function parseDateOnly(value: string): DateParts | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || '').trim())
  if (iso) return { y: Number(iso[1]), m: Number(iso[2]), d: Number(iso[3]) }

  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(value || '').trim())
  if (br) return { y: Number(br[3]), m: Number(br[2]), d: Number(br[1]) }

  return null
}

/** Data civil de hoje em Joinville (America/Sao_Paulo). */
export function civilToday(now = new Date()): DateParts {
  const [y, m, d] = CIVIL_ISO.format(now).split('-').map(Number)
  return { y, m, d }
}

/** Diferença em dias civis entre duas datas (`to - from`). */
export function daysBetween(from: DateParts, to: DateParts): number {
  const fromMs = Date.UTC(from.y, from.m - 1, from.d)
  const toMs = Date.UTC(to.y, to.m - 1, to.d)
  return Math.round((toMs - fromMs) / DAY_MS)
}

/** Formata partes de data como `DD/MM/YYYY`. */
export function formatCivilDate(value: string): string {
  const parts = parseDateOnly(value)
  if (!parts) return String(value || '')
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(parts.d)}/${pad(parts.m)}/${parts.y}`
}

function weekdayLabel(parts: DateParts): string {
  const date = new Date(Date.UTC(parts.y, parts.m - 1, parts.d, 12))
  return WEEKDAY.format(date)
}

function expiredPreposition(weekday: string): 'na' | 'no' {
  return weekday === 'sábado' || weekday === 'domingo' ? 'no' : 'na'
}

/**
 * Rótulo curto da data fim: hoje, amanhã, dia da semana ou DD/MM/YYYY.
 * Usa formato absoluto só quando a validade está a mais de 6 dias.
 */
export function formatPromoEndLabel(endOn: string, now = new Date()): string {
  const end = parseDateOnly(endOn)
  if (!end) return String(endOn || '')

  const diff = daysBetween(civilToday(now), end)
  if (diff > RELATIVE_PROMO_DAYS) return formatCivilDate(endOn)
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'amanhã'
  if (diff >= 2) return weekdayLabel(end)

  const daysPast = -diff
  if (daysPast > RELATIVE_PROMO_DAYS) return formatCivilDate(endOn)
  if (daysPast === 1) return 'ontem'

  const weekday = weekdayLabel(end)
  return `${expiredPreposition(weekday)} ${weekday}`
}

/** Texto completo de validade vigente. */
export function formatValidUntil(endOn: string, now = new Date()): string {
  const end = parseDateOnly(endOn)
  if (!end) return `Válido até ${endOn}`

  const diff = daysBetween(civilToday(now), end)
  if (diff < 0) return formatExpiredOn(endOn, now)

  const label = formatPromoEndLabel(endOn, now)
  if (diff > RELATIVE_PROMO_DAYS) return `Válido até ${label}`
  return `Válido até ${label}`
}

/** Texto completo de promoção expirada. */
export function formatExpiredOn(endOn: string, now = new Date()): string {
  const end = parseDateOnly(endOn)
  if (!end) return `Expirou em ${endOn}`

  const diff = daysBetween(civilToday(now), end)
  if (diff >= 0) return formatValidUntil(endOn, now)

  const daysPast = -diff
  if (daysPast > RELATIVE_PROMO_DAYS) return `Expirou em ${formatCivilDate(endOn)}`
  if (daysPast === 1) return 'Expirou ontem'

  const weekday = weekdayLabel(end)
  return `Expirou ${expiredPreposition(weekday)} ${weekday}`
}

export function formatRegisteredAt(iso: string, now = new Date()): string {
  const createdAt = new Date(iso)
  const elapsed = Math.max(0, now.getTime() - createdAt.getTime())

  if (elapsed < MINUTE_MS) return 'Cadastrado agora'
  if (elapsed < HOUR_MS) {
    return `Cadastrado há ${unit(Math.floor(elapsed / MINUTE_MS), 'minuto', 'minutos')}`
  }
  if (elapsed < DAY_MS) {
    return `Cadastrado há ${unit(Math.floor(elapsed / HOUR_MS), 'hora', 'horas')}`
  }

  const days = Math.floor(elapsed / DAY_MS)
  if (days < 30) return `Cadastrado há ${unit(days, 'dia', 'dias')}`

  return `Cadastrado em ${CIVIL_DATE.format(createdAt)}`
}
