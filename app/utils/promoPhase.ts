import {
  civilToday,
  daysBetween,
  formatCivilDate,
  formatExpiredOn,
  formatValidUntil,
  parseDateOnly,
} from './relativeTime'

export type PromoPhase = 'active' | 'upcoming' | 'expired'

type PromoDates = {
  promo_starts_on?: string | null
  promo_ends_on?: string | null
}

/** Vigência real da promo (independente de promo_active vindo da API). */
export function getPromoPhase(offer: PromoDates, now = new Date()): PromoPhase {
  const today = civilToday(now)
  const end = offer.promo_ends_on ? parseDateOnly(offer.promo_ends_on) : null
  const start = offer.promo_starts_on ? parseDateOnly(offer.promo_starts_on) : null

  if (end && daysBetween(today, end) < 0) return 'expired'
  if (start && daysBetween(today, start) > 0) return 'upcoming'
  return 'active'
}

export function isPromoExpired(offer: PromoDates, now = new Date()): boolean {
  return getPromoPhase(offer, now) === 'expired'
}

export function isPromoUpcoming(offer: PromoDates, now = new Date()): boolean {
  return getPromoPhase(offer, now) === 'upcoming'
}

/** True quando a promo está vigente e termina na data civil de hoje (Joinville). */
export function isEndingToday(offer: PromoDates, now = new Date()): boolean {
  if (!offer.promo_ends_on) return false
  const end = parseDateOnly(offer.promo_ends_on)
  if (!end) return false
  if (getPromoPhase(offer, now) !== 'active') return false
  return daysBetween(civilToday(now), end) === 0
}

/** Texto de validade coerente com a fase (não trata "em breve" como expirado). */
export function formatPromoValidityLabel(offer: PromoDates, now = new Date()): string {
  if (!offer.promo_ends_on) return ''

  const phase = getPromoPhase(offer, now)
  if (phase === 'expired') return formatExpiredOn(offer.promo_ends_on, now)
  if (phase === 'upcoming' && offer.promo_starts_on) {
    return `A partir de ${formatCivilDate(offer.promo_starts_on)} · válido até ${formatCivilDate(offer.promo_ends_on)}`
  }
  if (isEndingToday(offer, now)) return 'Termina hoje'
  return formatValidUntil(offer.promo_ends_on, now)
}
