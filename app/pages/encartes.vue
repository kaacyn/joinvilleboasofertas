<template>
  <div class="page">
    <AppHeader :sticky="false" />

    <FilterBar
      :facets="facets"
      :category-ids="[]"
      :establishment-ids="filters.establishmentIds.value"
      :sort="filters.sort.value"
      :show-categories="false"
      :show-sort="true"
      :sort-default="ENCARTES_SORT_DEFAULT"
      :sort-options="ENCARTES_SORT_OPTIONS"
      @apply-establishments="onApplyEstablishments"
      @update:sort="onSort"
    />

    <main class="page__main">
      <AppBreadcrumb :items="siteTrail({ label: 'Encartes' })" />
      <header class="page__intro">
        <h1>Encartes</h1>
        <p>Encartes das lojas de Joinville e região.</p>
        <NuxtLink
          to="/envie-um-encarte"
          class="intro-cta"
        >
          Envie um encarte
        </NuxtLink>
      </header>

      <p
        v-if="storesLoadError"
        class="filter-error"
        role="status"
      >
        Não foi possível carregar as lojas. Mostrando encartes de todas elas.
      </p>

      <p v-if="pending && !items.length" class="muted" aria-live="polite">
        Carregando…
      </p>
      <p v-else-if="loadError" class="muted" role="alert">
        Não foi possível carregar os encartes.
      </p>
      <p v-else-if="!items.length" class="muted">
        Nenhum encarte encontrado.
      </p>

      <div v-if="items.length" class="grid">
        <EncarteCard
          v-for="encarte in items"
          :key="encarte.id"
          :encarte="encarte"
          @open="open = $event"
        />
      </div>

      <p v-if="loadMoreError" class="more-error" role="alert">
        Não foi possível carregar mais encartes. Tente novamente.
      </p>
      <button
        v-if="nextCursor && items.length"
        type="button"
        class="more"
        :disabled="loadingMore"
        @click="loadMore"
      >
        {{ loadingMore ? 'Carregando…' : 'Carregar mais' }}
      </button>
    </main>

    <EncarteLightbox
      v-if="open"
      :encarte="open"
      @close="open = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ENCARTES_SORT_DEFAULT, ENCARTES_SORT_OPTIONS } from '~/composables/useEncartesFilters'
import { siteTrail } from '~/utils/breadcrumb'
import { jboGet, type JboEncarte, type JboEncartesPage, type JboFacets } from '~/utils/jboApi'

type Store = {
  id: string
  name: string
  slug: string
}

const route = useRoute()
const filters = useEncartesFilters()
const open = ref<JboEncarte | null>(null)
const items = ref<JboEncarte[]>([])
const nextCursor = ref<string | null>(null)
const loadingMore = ref(false)
const loadError = ref(false)
const loadMoreError = ref(false)
let requestGeneration = 0

const { data: storesData, error: storesError } = await useAsyncData(
  'jbo-encartes-stores',
  () => jboGet<{ items: Store[] }>('/encartes/stores'),
)
const stores = computed(() => storesData.value?.items || [])
const storesLoadError = computed(() => Boolean(storesError.value))
const facets = computed<JboFacets>(() => ({
  categories: [],
  establishments: stores.value.map(store => ({
    id: store.id,
    name: store.name,
  })),
}))

function fetchPage(
  cursor: string | null,
  selectedEstablishments: string[],
  sort: string,
) {
  return jboGet<JboEncartesPage>('/encartes', {
    establishment_ids: selectedEstablishments.length
      ? selectedEstablishments.join(',')
      : undefined,
    sort,
    cursor: cursor || undefined,
    limit: 20,
  })
}

const {
  data: initialPage,
  pending: initialPending,
  error: initialError,
} = await useAsyncData(
  'jbo-encartes',
  () => fetchPage(null, filters.establishmentIds.value, filters.sort.value),
  { watch: [() => route.query.establishment_ids, () => route.query.sort] },
)

items.value = initialPage.value?.items || []
nextCursor.value = initialPage.value?.next_cursor ?? null
loadError.value = Boolean(initialError.value)

const pending = computed(() => initialPending.value)

useSyncLoadingIndicator(pending)

watch(
  () => initialPage.value,
  (page) => {
    items.value = page?.items || []
    nextCursor.value = page?.next_cursor ?? null
    loadError.value = false
    loadMoreError.value = false
    loadingMore.value = false
    requestGeneration += 1
  },
)

watch(initialError, (error) => {
  loadError.value = Boolean(error)
})

async function onApplyEstablishments(ids: string[]) {
  await filters.setEstablishmentIds(ids)
}

async function onSort(sort: string) {
  await filters.setSort(sort)
}

async function loadMore() {
  const cursor = nextCursor.value
  if (!cursor || loadingMore.value) return

  const generation = requestGeneration
  const selectedEstablishments = [...filters.establishmentIds.value]
  const selectedSort = filters.sort.value
  loadingMore.value = true
  loadMoreError.value = false

  try {
    const page = await fetchPage(cursor, selectedEstablishments, selectedSort)
    if (generation !== requestGeneration) return

    items.value = [...items.value, ...page.items]
    nextCursor.value = page.next_cursor
  }
  catch {
    if (generation === requestGeneration) loadMoreError.value = true
  }
  finally {
    if (generation === requestGeneration) loadingMore.value = false
  }
}

useJboSeo({
  title: 'Encartes | Joinville Boas Ofertas',
  description: 'Encartes das lojas de Joinville e região.',
  path: '/encartes',
})
</script>

<style scoped>
.page__main {
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  padding: 1.25rem 1rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.page__main :deep(.crumbs) {
  margin-bottom: 0;
}

.page__intro h1 {
  margin: 0 0 0.35rem;
  font-size: 1.45rem;
  font-weight: 900;
}

.page__intro p {
  margin: 0;
  color: var(--muted);
  font-size: 0.95rem;
}

.intro-cta {
  display: inline-flex;
  margin-top: 0.65rem;
  padding: 0.55rem 0.9rem;
  border-radius: 10px;
  background: var(--yellow);
  color: var(--navy);
  font-weight: 800;
  font-size: 0.88rem;
  text-decoration: none;
}

.filter-error {
  margin: 0;
  color: var(--red);
  font-size: 0.82rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 210px), 1fr));
  gap: 0.85rem;
}

.more {
  align-self: center;
  min-width: 150px;
  border: 1px solid var(--yellow);
  border-radius: 10px;
  padding: 0.65rem 1rem;
  background: var(--yellow);
  color: var(--navy);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 800;
  cursor: pointer;
}

.more:disabled {
  cursor: wait;
  opacity: 0.65;
}

.more-error {
  margin: 0;
  color: var(--red);
  font-size: 0.82rem;
  text-align: center;
}

.muted {
  color: var(--muted);
}
</style>
