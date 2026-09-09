import type { LocationQuery } from 'vue-router'

export const ENCARTES_SORT_DEFAULT = 'created'
export const ENCARTES_SORTS = ['created', 'ends'] as const
export type EncantesSort = typeof ENCARTES_SORTS[number]

export const ENCARTES_SORT_OPTIONS = [
  { value: 'created', label: 'Cadastro' },
  { value: 'ends', label: 'Vencimento' },
] as const

export type EncantesFiltersState = {
  establishmentIds: string[]
  sort: EncantesSort
}

/**
 * Lê lojas selecionadas da query string.
 */
export function establishmentIdsFromQuery(query: LocationQuery): string[] {
  return String(query.establishment_ids || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

/**
 * Lê ordenação da query string.
 */
export function sortFromQuery(query: LocationQuery): EncantesSort {
  const raw = String(query.sort || ENCARTES_SORT_DEFAULT)
  return ENCARTES_SORTS.includes(raw as EncantesSort)
    ? raw as EncantesSort
    : ENCARTES_SORT_DEFAULT
}

/**
 * Lê filtros dos encartes da query string.
 */
export function encartesFiltersFromQuery(query: LocationQuery): EncantesFiltersState {
  return {
    establishmentIds: establishmentIdsFromQuery(query),
    sort: sortFromQuery(query),
  }
}

/**
 * Monta query da URL com lojas e ordenação.
 */
export function encartesFiltersToQuery(f: EncantesFiltersState): Record<string, string> {
  const out: Record<string, string> = {}
  if (f.establishmentIds.length) out.establishment_ids = f.establishmentIds.join(',')
  if (f.sort && f.sort !== ENCARTES_SORT_DEFAULT) out.sort = f.sort
  return out
}

/**
 * Filtros dos encartes sincronizados com a URL.
 */
export function useEncartesFilters() {
  const route = useRoute()
  const router = useRouter()

  const state = computed(() => encartesFiltersFromQuery(route.query))
  const establishmentIds = computed(() => state.value.establishmentIds)
  const sort = computed(() => state.value.sort)

  /**
   * Atualiza a query da rota com um patch parcial.
   */
  async function patch(partial: Partial<EncantesFiltersState>) {
    const next = { ...state.value, ...partial }
    await router.replace({ query: encartesFiltersToQuery(next) })
  }

  /**
   * Atualiza lojas filtradas na URL.
   */
  async function setEstablishmentIds(ids: string[]) {
    await patch({ establishmentIds: ids })
  }

  /**
   * Atualiza ordenação na URL.
   */
  async function setSort(next: string) {
    await patch({
      sort: ENCARTES_SORTS.includes(next as EncantesSort)
        ? next as EncantesSort
        : ENCARTES_SORT_DEFAULT,
    })
  }

  return {
    establishmentIds,
    sort,
    setEstablishmentIds,
    setSort,
  }
}
