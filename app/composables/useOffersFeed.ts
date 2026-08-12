import { jboGet, type JboOffer, type JboOffersPage } from '~/utils/jboApi'

/**
 * Feed paginado de ofertas com cursor.
 */
export function useOffersFeed() {
  const items = ref<JboOffer[]>([])
  const nextCursor = ref<string | null>(null)
  const loading = ref(false)
  const error = ref(false)

  const hasMore = computed(() => Boolean(nextCursor.value))

  /**
   * Carrega a primeira página com os params atuais.
   */
  async function loadFirstPage(params: Record<string, unknown> = {}) {
    loading.value = true
    error.value = false
    try {
      const page = await jboGet<JboOffersPage>('/offers', {
        ...params,
        page_size: 20,
      })
      items.value = page.items || []
      nextCursor.value = page.next_cursor
    }
    catch {
      error.value = true
      items.value = []
      nextCursor.value = null
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Carrega a próxima página e concatena itens.
   */
  async function loadMore(params: Record<string, unknown> = {}) {
    if (!nextCursor.value || loading.value) return
    loading.value = true
    error.value = false
    try {
      const page = await jboGet<JboOffersPage>('/offers', {
        ...params,
        cursor: nextCursor.value,
        page_size: 20,
      })
      items.value = [...items.value, ...(page.items || [])]
      nextCursor.value = page.next_cursor
    }
    catch {
      error.value = true
    }
    finally {
      loading.value = false
    }
  }

  return {
    items,
    hasMore,
    loading,
    error,
    loadFirstPage,
    loadMore,
  }
}
