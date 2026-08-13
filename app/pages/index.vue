<template>
  <div class="home">
    <AppHeader>
      <SearchBar v-model="qDraft" @submit="onSearch" />
    </AppHeader>

    <FilterBar
      :active-count="activeCount"
      :sort="filters.state.value.sort"
      @open-sheet="sheetOpen = true"
      @update:sort="onSort"
    />

    <section class="home__deals" aria-label="Ofertas em Joinville">
      <header class="home__intro">
        <h1>Ofertas em Joinville</h1>
        <p>Último preço por produto e supermercado — inclui ofertas já expiradas.</p>
      </header>

      <OfferCard
        v-for="offer in items"
        :key="offer.id"
        :offer="offer"
      />

      <div v-if="hasMore" ref="sentinelRef" class="home__sentinel" />

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

    <FiltersSheet
      :open="sheetOpen"
      :facets="facets"
      :applied="{
        category_ids: filters.state.value.category_ids,
        establishment_ids: filters.state.value.establishment_ids,
        price_min: filters.state.value.price_min,
        price_max: filters.state.value.price_max,
      }"
      @update:open="sheetOpen = $event"
      @apply="onApplyFilters"
      @clear="filters.clear(true)"
    />
  </div>
</template>

<script setup lang="ts">
import { jboGet, type JboFacets, type JboOffer, type JboOffersPage } from '~/utils/jboApi'

const filters = useOfferFilters()
const sheetOpen = ref(false)
const sentinelRef = ref<HTMLElement | null>(null)
const qDraft = ref(filters.state.value.q)
const activeCount = filters.activeCount
const config = useRuntimeConfig()

const extraItems = ref<JboOffer[]>([])
const nextCursor = ref<string | null>(null)
const loadingMore = ref(false)

useSeoMeta({
  title: 'Ofertas em Joinville | Joinville Boas Ofertas',
  description: 'Compare preços vigentes nos supermercados de Joinville e região.',
  ogTitle: 'Ofertas em Joinville | Joinville Boas Ofertas',
  ogDescription: 'Compare preços vigentes nos supermercados de Joinville e região.',
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Joinville Boas Ofertas',
        url: config.public.siteUrl,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${config.public.siteUrl}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      }),
    },
  ],
})

const { data: facetsData } = await useAsyncData(
  'jbo-facets',
  () => jboGet<JboFacets>('/offers/facets').catch(() => ({
    categories: [],
    establishments: [],
  })),
)
const facets = computed<JboFacets>(() => facetsData.value || {
  categories: [],
  establishments: [],
})

const {
  data: pageData,
  pending,
  error: pageError,
  refresh,
} = await useAsyncData(
  'jbo-offers',
  () => jboGet<JboOffersPage>('/offers', {
    ...filters.apiParams.value,
    page_size: 20,
  }),
  { watch: [() => JSON.stringify(filters.apiParams.value)] },
)

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
 * Aplica filtros do sheet.
 */
async function onApplyFilters(draft: {
  category_ids: string[]
  establishment_ids: string[]
  price_min?: number | null
  price_max?: number | null
}) {
  await filters.patch({
    category_ids: draft.category_ids,
    establishment_ids: draft.establishment_ids,
    price_min: draft.price_min ?? null,
    price_max: draft.price_max ?? null,
  })
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

.home__intro h1 {
  margin: 0 0 0.35rem;
  font-size: 1.35rem;
  font-weight: 900;
}

.home__intro p {
  margin: 0 0 0.75rem;
  color: var(--muted);
  font-size: 0.9rem;
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
