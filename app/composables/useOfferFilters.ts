import type { LocationQuery } from 'vue-router'

export type OfferFiltersState = {
  q: string
  category_ids: string[]
  establishment_ids: string[]
  price_min: number | null
  price_max: number | null
  sort: string
}

/**
 * Lê filtros da query string da rota.
 */
export function filtersFromQuery(query: LocationQuery): OfferFiltersState {
  const csv = (key: string) =>
    String(query[key] || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

  const num = (key: string) => {
    const raw = query[key]
    if (raw == null || raw === '') return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }

  return {
    q: String(query.q || ''),
    category_ids: csv('category_ids'),
    establishment_ids: csv('establishment_ids'),
    price_min: num('price_min'),
    price_max: num('price_max'),
    sort: String(query.sort || 'recent'),
  }
}

/**
 * Converte estado de filtros em query da URL.
 */
export function filtersToQuery(f: OfferFiltersState): Record<string, string> {
  const out: Record<string, string> = {}
  if (f.q) out.q = f.q
  if (f.category_ids.length) out.category_ids = f.category_ids.join(',')
  if (f.establishment_ids.length) out.establishment_ids = f.establishment_ids.join(',')
  if (f.price_min != null) out.price_min = String(f.price_min)
  if (f.price_max != null) out.price_max = String(f.price_max)
  if (f.sort && f.sort !== 'recent') out.sort = f.sort
  return out
}

/**
 * Params enviados à API de ofertas.
 */
export function filtersToApiParams(f: OfferFiltersState): Record<string, unknown> {
  return {
    q: f.q || undefined,
    category_ids: f.category_ids.length ? f.category_ids.join(',') : undefined,
    establishment_ids: f.establishment_ids.length
      ? f.establishment_ids.join(',')
      : undefined,
    price_min: f.price_min ?? undefined,
    price_max: f.price_max ?? undefined,
    sort: f.sort || 'recent',
  }
}

/**
 * Quantidade de filtros ativos (exceto busca e sort).
 */
export function filtersActiveCount(f: OfferFiltersState): number {
  let n = 0
  n += f.category_ids.length
  n += f.establishment_ids.length
  if (f.price_min != null) n += 1
  if (f.price_max != null) n += 1
  return n
}

/**
 * Estado reativo de filtros sincronizado com a URL.
 */
export function useOfferFilters() {
  const route = useRoute()
  const router = useRouter()

  const state = computed(() => filtersFromQuery(route.query))

  /**
   * Atualiza a query da rota com um patch parcial de filtros.
   */
  async function patch(partial: Partial<OfferFiltersState>) {
    const next = { ...state.value, ...partial }
    await router.replace({ query: filtersToQuery(next) })
  }

  /**
   * Limpa todos os filtros mantendo só a busca se desejado.
   */
  async function clear(keepQ = false) {
    await router.replace({
      query: keepQ && state.value.q ? { q: state.value.q } : {},
    })
  }

  return {
    state,
    patch,
    clear,
    activeCount: computed(() => filtersActiveCount(state.value)),
    apiParams: computed(() => filtersToApiParams(state.value)),
  }
}
