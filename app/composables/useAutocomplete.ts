import { onBeforeUnmount, ref, type Ref } from 'vue'

/**
 * Composable headless para autocomplete (portado do Snap, sem telemetria).
 */
export function useAutocomplete<T extends { id?: string, name?: string }>(opts: {
  fetcher: (q: string, ctx: { signal: AbortSignal }) => Promise<T[]>
  minChars?: number
  debounceMs?: number
  onSelect?: (item: T) => void
  onSubmit?: (query: string) => void
}) {
  const {
    fetcher,
    minChars = 1,
    debounceMs = 200,
    onSelect = () => {},
    onSubmit = () => {},
  } = opts

  const listboxId = `ac-${Math.random().toString(36).slice(2, 9)}`
  const optionId = (i: number) => `${listboxId}-opt-${i}`

  const query = ref('')
  const items = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const error = ref<unknown>(null)
  const open = ref(false)
  const activeIndex = ref(-1)

  let debounceId: ReturnType<typeof setTimeout> | null = null
  let currentController: AbortController | null = null

  const CACHE_SIZE = 20
  const cache = new Map<string, T[]>()

  function cacheGet(q: string): T[] | null {
    if (!cache.has(q)) return null
    const v = cache.get(q)!
    cache.delete(q)
    cache.set(q, v)
    return v
  }

  function cacheSet(q: string, v: T[]) {
    if (cache.has(q)) cache.delete(q)
    cache.set(q, v)
    if (cache.size > CACHE_SIZE) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined) cache.delete(oldest)
    }
  }

  /**
   * Atualiza a query. Com `fetch: false` só sincroniza (atalhos/URL) —
   * não busca nem abre o painel.
   */
  function setQuery(q: string, opts?: { fetch?: boolean }) {
    const shouldFetch = opts?.fetch !== false
    query.value = q
    if (debounceId) clearTimeout(debounceId)
    if (!q || q.length < minChars) {
      currentController?.abort()
      items.value = []
      open.value = false
      loading.value = false
      return
    }
    if (!shouldFetch) {
      currentController?.abort()
      items.value = []
      open.value = false
      loading.value = false
      return
    }
    debounceId = setTimeout(() => { void doFetch(q) }, debounceMs)
  }

  async function doFetch(q: string) {
    const cached = cacheGet(q)
    if (cached) {
      items.value = cached
      open.value = true
      activeIndex.value = -1
      return
    }

    if (currentController) currentController.abort()
    const controller = new AbortController()
    currentController = controller

    loading.value = true
    error.value = null
    open.value = true
    try {
      const result = await fetcher(q, { signal: controller.signal })
      if (controller.signal.aborted) return
      const arr = Array.isArray(result) ? result : []
      cacheSet(q, arr)
      items.value = arr
      open.value = true
      activeIndex.value = -1
    }
    catch (e) {
      if (controller.signal.aborted) return
      error.value = e
      items.value = []
      open.value = true
    }
    finally {
      if (currentController === controller) loading.value = false
    }
  }

  function close() {
    open.value = false
    activeIndex.value = -1
  }

  function reopenIfHasItems() {
    if (items.value.length > 0) open.value = true
  }

  function selectAt(i: number) {
    const item = items.value[i]
    if (!item) return
    close()
    onSelect(item)
  }

  function submitCurrent() {
    close()
    onSubmit(query.value)
  }

  function onInputKeydown(ev: KeyboardEvent) {
    if (!open.value && !['Enter', 'ArrowDown'].includes(ev.key)) return
    if (ev.key === 'ArrowDown') {
      ev.preventDefault()
      if (items.value.length === 0) return
      activeIndex.value = (activeIndex.value + 1) % items.value.length
    }
    else if (ev.key === 'ArrowUp') {
      ev.preventDefault()
      if (items.value.length === 0) return
      activeIndex.value = activeIndex.value <= 0
        ? items.value.length - 1
        : activeIndex.value - 1
    }
    else if (ev.key === 'Enter') {
      ev.preventDefault()
      if (activeIndex.value >= 0) selectAt(activeIndex.value)
      else submitCurrent()
    }
    else if (ev.key === 'Escape') {
      ev.preventDefault()
      close()
    }
    else if (ev.key === 'Tab') {
      close()
    }
  }

  onBeforeUnmount(() => {
    if (debounceId) clearTimeout(debounceId)
    currentController?.abort()
  })

  return {
    query,
    setQuery,
    items,
    loading,
    error,
    open,
    activeIndex,
    close,
    reopenIfHasItems,
    selectAt,
    onInputKeydown,
    listboxId,
    optionId,
  }
}
