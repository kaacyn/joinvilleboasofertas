/** Fuso fixo para a data civil não variar com o timezone do runtime (SSR ou browser). */
const CIVIL_DATE = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

function unit(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`
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
