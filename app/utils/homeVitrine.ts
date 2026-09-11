/** Regras da home vitrine: quando mostrar seções e como escolher hero e carrossel. */

import type { OfferFiltersState } from '~/composables/useOfferFilters'
import type { JboOffer } from '~/utils/jboApi'
import { getPromoPhase } from '~/utils/promoPhase'

/** True quando não há busca, filtro, faixa de preço, ends_today nem ordenação diferente de recent. */
export function isVitrineState(state: OfferFiltersState): boolean {
  return !state.q
    && state.category_ids.length === 0
    && state.establishment_ids.length === 0
    && state.price_min == null
    && state.price_max == null
    && !state.ends_today
    && state.sort === 'recent'
}

/** Economia real: promo vigente e preço abaixo da média (diff_percent negativo). */
export function isRealSavings(offer: JboOffer, now = new Date()): boolean {
  return getPromoPhase(offer, now) === 'active' && Number(offer.diff_percent) < 0
}

/** Primeiro item com economia real (a API já ordena por economia); null se nenhum. */
export function pickHero(items: JboOffer[], now = new Date()): JboOffer | null {
  return items.find(item => isRealSavings(item, now)) ?? null
}

/** Itens com economia real para o carrossel, sem o hero, até `limit`. */
export function pickTopSavings(
  items: JboOffer[],
  heroId: string | null,
  limit = 8,
  now = new Date(),
): JboOffer[] {
  return items
    .filter(item => item.id !== heroId && isRealSavings(item, now))
    .slice(0, limit)
}
