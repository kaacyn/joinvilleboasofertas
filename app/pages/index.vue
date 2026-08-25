<template>
  <div class="home">
    <AppHeader>
      <SearchBar v-model="qDraft" @submit="onSearch" />
    </AppHeader>

    <FilterBar
      :facets="facets"
      :category-ids="filters.state.value.category_ids"
      :establishment-ids="filters.state.value.establishment_ids"
      :sort="filters.state.value.sort"
      @update:sort="onSort"
      @apply-categories="onApplyCategories"
      @apply-establishments="onApplyEstablishments"
    />

    <section class="home__deals" aria-label="Ofertas em Joinville">
      <StoryShortcuts
        :q="filters.state.value.q"
        :category-ids="filters.state.value.category_ids"
        :categories="facets.categories"
        @select="onShortcut"
      />

      <OfferCard
        v-for="offer in items"
        :key="offer.id"
        :offer="offer"
      />

      <div v-if="hasMore" ref="sentinelRef" class="home__sentinel" />

      <div
        v-if="loadingMore"
        class="home__loading home__loading--more"
        aria-live="polite"
      >
        Carregando mais produtos
      </div>

      <div v-if="pending" class="home__loading" aria-live="polite">
        Carregando ofertas…
      </div>

      <div v-if="!pending && !loadError && items.length === 0" class="home__empty">
        <p v-if="filters.state.value.q">
          Nenhuma oferta para “{{ filters.state.value.q }}”.
        </p>
        <p v-else-if="activeCount > 0">Nenhuma oferta com esses filtros.</p>
        <p v-else>Nenhuma oferta disponível no momento.</p>
        <button
          v-if="filters.state.value.q || activeCount > 0"
          type="button"
          @click="filters.clear()"
        >
          Limpar filtros
        </button>
      </div>

      <div v-if="loadError" class="home__error">
        <p>Não foi possível carregar as ofertas.</p>
        <button type="button" @click="refresh">Tentar de novo</button>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { jboGet, type JboFacets, type JboOffer, type JboOffersPage } from '~/utils/jboApi'
import {
  nextShortcutPatch,
  type StoryShortcut,
} from '~/utils/storyShortcuts'

const filters = useOfferFilters()
const sentinelRef = ref<HTMLElement | null>(null)
const qDraft = ref(filters.state.value.q)
const activeCount = filters.activeCount
const config = useRuntimeConfig()

const extraItems = ref<JboOffer[]>([])
const nextCursor = ref<string | null>(null)
const loadingMore = ref(false)

useJboSeo({
  title: 'Ofertas em Joinville | Joinville Boas Ofertas',
  description: 'Compare preços vigentes nos supermercados de Joinville e região.',
  path: '/',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Joinville Boas Ofertas',
    url: config.public.siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${config.public.siteUrl}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  },
})

const [facetsResult, offersResult] = await Promise.all([
  useAsyncData(
    'jbo-facets',
    () => jboGet<JboFacets>('/offers/facets').catch(() => ({
      categories: [],
      establishments: [],
    })),
  ),
  useAsyncData(
    'jbo-offers',
    () => jboGet<JboOffersPage>('/offers', {
      ...filters.apiParams.value,
      page_size: 20,
    }),
    { watch: [() => JSON.stringify(filters.apiParams.value)] },
  ),
])

const facetsData = facetsResult.data
const facets = computed<JboFacets>(() => facetsData.value || {
  categories: [],
  establishments: [],
})

const {
  data: pageData,
  pending,
  error: pageError,
  refresh,
} = offersResult

useSyncLoadingIndicator(pending)

const items = computed(() => [
  ...(pageData.value?.items || []),
  ...extraItems.value,
])
const hasMore = computed(() => Boolean(nextCursor.value))
const loadError = computed(() => Boolean(pageError.value))

watch(pageData, (page) => {
  extraItems.value = []
  nextCursor.value = page?.next_cursor ?? null
}, { immediate: true })

watch(
  () => filters.state.value.q,
  (q) => { qDraft.value = q },
)

/**
 * Aplica busca na URL.
 */
async function onSearch() {
  await filters.patch({ q: qDraft.value.trim() })
}

/**
 * Atualiza ordenação.
 */
async function onSort(sort: string) {
  await filters.patch({ sort })
}

/**
 * Aplica categorias escolhidas no chip da filterbar.
 */
async function onApplyCategories(ids: string[]) {
  await filters.patch({ category_ids: ids })
}

/**
 * Aplica lojas escolhidas no chip da filterbar.
 */
async function onApplyEstablishments(ids: string[]) {
  await filters.patch({ establishment_ids: ids })
}

/**
 * Aplica (ou desliga) um atalho estático da faixa Stories.
 */
async function onShortcut(item: StoryShortcut) {
  const patch = nextShortcutPatch(
    item,
    {
      q: filters.state.value.q,
      category_ids: filters.state.value.category_ids,
    },
    facets.value.categories,
  )
  await filters.patch(patch)
}

/**
 * Carrega a próxima página do cursor.
 */
async function loadMore() {
  if (!nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const page = await jboGet<JboOffersPage>('/offers', {
      ...filters.apiParams.value,
      cursor: nextCursor.value,
      page_size: 20,
    })
    extraItems.value = [...extraItems.value, ...(page.items || [])]
    nextCursor.value = page.next_cursor
  }
  finally {
    loadingMore.value = false
  }
}

onMounted(() => {
  const io = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) loadMore()
  }, { rootMargin: '200px' })

  watch(sentinelRef, (el, _, onCleanup) => {
    if (!el) return
    io.observe(el)
    onCleanup(() => io.unobserve(el))
  }, { immediate: true })
})
</script>

<style scoped>
.home__deals {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 720px;
  margin: 0 auto;
}

.home__sentinel {
  height: 1px;
}

.home__loading,
.home__empty,
.home__error {
  text-align: center;
  color: var(--muted);
  padding: 1.5rem 0.5rem;
}

.home__empty button,
.home__error button {
  margin-top: 0.75rem;
  border: none;
  background: var(--yellow);
  color: var(--navy);
  font-weight: 800;
  border-radius: 10px;
  padding: 0.6rem 1rem;
  cursor: pointer;
}
</style>
