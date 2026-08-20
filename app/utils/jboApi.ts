/** Tipos e client HTTP da API pública JBO. */

export type JboOffer = {
  id: string
  product_id: string
  product_name: string
  product_slug: string
  category_name?: string | null
  category_slug?: string | null
  establishment_id: string
  establishment_name: string
  establishment_slug: string
  establishment_loyalty_program_name?: string
  establishment_logo_url?: string | null
  establishment_address?: string | null
  establishment_addresses?: string[]
  price: string | number
  is_club_price?: boolean
  promo_starts_on?: string | null
  promo_ends_on?: string | null
  promo_active?: boolean
  avg_price?: string | number | null
  diff_percent?: number
  diff_amount?: string | number | null
  recorded_at: string
  image_url?: string | null
  encarte_id?: string | null
  price_volume_min?: string | number | null
  volume_unit_min?: string
  comparison_base?: number | null
  volume_value?: string | number | null
  volume_unit?: string
  pricing_mode?: string
}

export const DEFAULT_CLUB_LABEL = 'Clube'

/** Rótulo do badge de preço de fidelidade (programa do mercado ou "Clube"). */
export function clubBadgeLabel(offer: {
  is_club_price?: boolean
  establishment_loyalty_program_name?: string | null
}): string {
  if (!offer.is_club_price) return ''
  const custom = String(offer.establishment_loyalty_program_name || '').trim()
  return custom || DEFAULT_CLUB_LABEL
}

/** Texto descritivo na página do produto (ex.: "Preço cooperado"). */
export function clubPriceHint(offer: {
  is_club_price?: boolean
  establishment_loyalty_program_name?: string | null
}): string {
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

export type JboFacets = {
  categories: { id: string, name: string }[]
  establishments: { id: string, name: string }[]
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
): Promise<T> {
  const cleaned = Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
  return $fetch<T>(`${apiOrigin()}/api/public/jbo${path}`, { query: cleaned })
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
