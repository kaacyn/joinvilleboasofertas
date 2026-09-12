/** Tipos e client HTTP da API pública JBO. */

export type JboPricingReference = {
  value: string | number
  unit: string
}

/** Base do preço: `unit` (1 unidade), `lot` (N por R$ X) ou `per_fraction` (por kg / a cada 100 g). */
export type JboPricing = {
  basis: 'unit' | 'lot' | 'per_fraction' | string
  lot_quantity?: number | null
  reference?: JboPricingReference | null
}

export type JboQuantity = {
  value?: number | string | null
  unit?: string | null
  contains?: number | null
}

/** Caixa normalizada (0..1) da oferta dentro da foto do encarte. */
export type JboBbox = {
  x: number
  y: number
  w: number
  h: number
}

export type JboOffer = {
  id: string
  product_id: string
  product_name: string
  product_slug: string
  brand?: string
  category_name?: string | null
  category_slug?: string | null
  establishment_id: string
  establishment_name: string
  establishment_slug: string
  establishment_loyalty_program_name?: string
  establishment_logo_url?: string | null
  establishment_address?: string | null
  establishment_addresses?: string[]
  /** Endereços onde a oferta vale, quando restrita a parte das lojas. */
  offer_addresses?: string[]
  price?: string | number | null
  club_price?: string | number | null
  is_club_price?: boolean
  currency?: string
  pricing?: JboPricing | null
  quantity?: JboQuantity | null
  quantity_label?: string
  promotion?: string
  loyalty_program?: boolean | null
  quantity_discount?: Record<string, unknown> | null
  promo_starts_on?: string | null
  promo_ends_on?: string | null
  promo_active?: boolean
  unit_price?: string | number | null
  unit_price_base?: string
  avg_price?: string | number | null
  diff_percent?: number
  diff_amount?: string | number | null
  recorded_at: string
  image_url?: string | null
  encarte_id?: string | null
  encarte_bbox?: JboBbox | null
}

export const DEFAULT_CLUB_LABEL = 'Clube'

type ClubSource = {
  is_club_price?: boolean
  club_price?: string | number | null
  establishment_loyalty_program_name?: string | null
}

/** True quando a oferta tem preço de clube (exclusivo ou ao lado do regular). */
export function hasClubPrice(offer: ClubSource): boolean {
  return Boolean(offer.is_club_price) || (offer.club_price != null && offer.club_price !== '')
}

/** Rótulo do badge de preço de fidelidade (programa do mercado ou "Clube"). */
export function clubBadgeLabel(offer: ClubSource): string {
  if (!hasClubPrice(offer)) return ''
  const custom = String(offer.establishment_loyalty_program_name || '').trim()
  return custom || DEFAULT_CLUB_LABEL
}

/** Texto descritivo na página do produto (ex.: "Preço cooperado"). */
export function clubPriceHint(offer: ClubSource): string {
  const label = clubBadgeLabel(offer)
  if (!label) return ''
  if (label === DEFAULT_CLUB_LABEL) return 'Preço de clube'
  return `Preço ${label.toLowerCase()}`
}

export type JboOffersPage = {
  items: JboOffer[]
  next_cursor: string | null
}

export type JboEncarte = {
  id: string
  establishment_id: string
  establishment_name: string
  establishment_slug: string
  establishment_logo_url?: string | null
  promo_starts_on?: string | null
  promo_ends_on: string
  promo_active: boolean
  image_url?: string | null
  image_url_xl?: string | null
  created_at: string
}

export type JboEncartesPage = {
  items: JboEncarte[]
  next_cursor: string | null
}

/** Ofertas publicadas de um encarte, na ordem em que aparecem na foto. */
export type JboEncarteOffers = {
  items: JboOffer[]
}

export type JboFacetItem = { id: string, name: string, slug?: string | null }

export type JboFacets = {
  categories: JboFacetItem[]
  establishments: JboFacetItem[]
}

/**
 * Resolve a base da API: no SSR usa snap-api na rede Docker;
 * no browser usa same-origin (nginx proxy /api).
 */
function apiOrigin(): string {
  const config = useRuntimeConfig()
  if (import.meta.server) {
    return String(config.apiBase || '').replace(/\/$/, '')
  }
  return ''
}

/**
 * GET same-origin / interno em /api/public/jbo.
 */
export async function jboGet<T>(
  path: string,
  query: Record<string, unknown> = {},
  opts: { signal?: AbortSignal } = {},
): Promise<T> {
  const cleaned = Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
  return $fetch<T>(`${apiOrigin()}/api/public/jbo${path}`, {
    query: cleaned,
    signal: opts.signal,
  })
}

/** Sugestão de produto; marca e embalagem diferenciam variantes com o mesmo nome. */
export type JboSuggestItem = {
  id: string
  name: string
  brand?: string
  quantity_label?: string
}

/** Sugestões de produto para o autocomplete da busca (estilo Snap). */
export function fetchProductSuggestions(
  q: string,
  opts: { signal?: AbortSignal } = {},
): Promise<JboSuggestItem[]> {
  return jboGet<JboSuggestItem[]>('/products/suggest', { q }, opts)
}

/**
 * POST/PUT same-origin / interno em /api/public/jbo.
 */
export async function jboSend<T>(
  method: 'POST' | 'PUT',
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  return $fetch<T>(`${apiOrigin()}/api/public/jbo${path}`, { method, body })
}

/**
 * URL exclusiva do produto naquela loja.
 */
export function productOfferPath(offer: {
  product_slug?: string | null
  product_id: string
  establishment_slug?: string | null
}): string {
  const product = offer.product_slug || offer.product_id
  if (offer.establishment_slug) {
    return `/produto/${product}/${offer.establishment_slug}`
  }
  return `/produto/${product}`
}
