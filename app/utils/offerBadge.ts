/** Badge do canto da imagem do card: fase da promo, economia e preço de clube. */

import { clubBadgeLabel, type JboOffer } from '~/utils/jboApi'
import { offerMainPrice } from '~/utils/offerPrice'
import { getPromoPhase } from '~/utils/promoPhase'

export type OfferBadgeKind = 'expired' | 'upcoming' | 'savings' | 'club'

export type OfferBadge = {
  kind: OfferBadgeKind
  /** Texto curto em caixa alta: "EXPIRADO", "EM BREVE", "-28%", "CLUBE -28%", "CLUBE". */
  label: string
  /** True quando o preço principal é o de clube (badge amarelo). */
  club: boolean
}

type BadgeSource = Pick<
  JboOffer,
  'price' | 'club_price' | 'is_club_price' | 'establishment_loyalty_program_name'
  | 'diff_percent' | 'promo_starts_on' | 'promo_ends_on'
>

/** Percentual de economia contra a média, arredondado e positivo; 0 quando não há economia. */
export function savingsPercent(offer: Pick<JboOffer, 'diff_percent'>): number {
  const pct = Number(offer.diff_percent)
  if (!Number.isFinite(pct) || pct >= 0) return 0
  return Math.abs(Math.round(pct))
}

/** Decide o badge da oferta; null quando não há nada a destacar. */
export function offerBadge(offer: BadgeSource, now = new Date()): OfferBadge | null {
  const phase = getPromoPhase(offer, now)
  if (phase === 'expired') return { kind: 'expired', label: 'EXPIRADO', club: false }
  if (phase === 'upcoming') return { kind: 'upcoming', label: 'EM BREVE', club: false }

  const isClub = Boolean(offerMainPrice(offer)?.isClub)
  const pct = savingsPercent(offer)
  if (pct > 0) {
    return { kind: 'savings', label: isClub ? `CLUBE -${pct}%` : `-${pct}%`, club: isClub }
  }
  if (isClub) {
    return { kind: 'club', label: clubBadgeLabel(offer).toUpperCase(), club: true }
  }
  return null
}
