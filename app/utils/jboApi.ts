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
  establishment_logo_url?: string | null
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
  price_volume_min?: string | number | null
  volume_unit_min?: string
  comparison_base?: number | null
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
