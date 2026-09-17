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

/** Quantas ofertas giram no carrossel do topo ("Maior economia do dia"). */
export const HOME_HERO_LIMIT = 5

/**
 * Quantas ofertas pedir para o topo: um pool bem maior que o limite, porque o
 * sorteio só vale a pena se houver de onde escolher (e promo fora de vigência
 * ainda cai no filtro de economia real). Teto da API: 50.
 */
export const HOME_HERO_PAGE_SIZE = 25

/**
 * Gerador pseudoaleatório determinístico (mulberry32).
 * Semente igual devolve a mesma sequência, então o sorteio feito no SSR se
 * repete na hidratação e o Vue não acusa divergência de marcação.
 */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6D2B79F5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Embaralha uma cópia da lista (Fisher-Yates) com aleatoriedade semeada. */
function shuffleSeeded<T>(items: T[], seed: number): T[] {
  const out = items.slice()
  const random = seededRandom(seed)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const swap = out[i] as T
    out[i] = out[j] as T
    out[j] = swap
  }
  return out
}

/**
 * Ofertas do carrossel do topo: só economia real, sorteadas do pool inteiro
 * pela semente e cortadas em `limit`. A semente vem da página (useState), o que
 * mantém servidor e browser com a mesma seleção e troca a cada carregamento.
 */
export function pickHeroRotation(
  items: JboOffer[],
  seed: number,
  limit = HOME_HERO_LIMIT,
  now = new Date(),
): JboOffer[] {
  return shuffleSeeded(items.filter(item => isRealSavings(item, now)), seed).slice(0, limit)
}

/** Categorias com carrossel próprio na home, na ordem em que aparecem. */
export const HOME_CATEGORY_SLUGS = ['mercearia', 'acougue', 'bebidas', 'hortifruti'] as const

/** Máximo de ofertas em cada carrossel de categoria. */
export const HOME_CAROUSEL_LIMIT = 20

/**
 * Quantas ofertas pedir por carrossel: acima do limite porque promo que ainda
 * não começou sai no filtro (as vencidas a API já manda para o fim). Teto da API: 50.
 */
export const HOME_CAROUSEL_PAGE_SIZE = 25

/** Carrossel de categoria: ordem da API (economia), só promo vigente, até `limit`. */
export function pickCategoryHighlights(
  items: JboOffer[],
  limit = HOME_CAROUSEL_LIMIT,
  now = new Date(),
): JboOffer[] {
  return items
    .filter(item => getPromoPhase(item, now) === 'active')
    .slice(0, limit)
}
