<template>
  <div class="home">
    <AppHeader>
      <SearchBar v-model="qDraft" @submit="onSearch" />
    </AppHeader>

    <FilterBar
      pin-below-header
      :facets="facets"
      :category-ids="filters.state.value.category_ids"
      :establishment-ids="filters.state.value.establishment_ids"
      :sort="filters.state.value.sort"
      @update:sort="onSort"
      @apply-categories="onApplyCategories"
      @apply-establishments="onApplyEstablishments"
    />

    <template v-if="isVitrine">
      <div v-if="heroOffers.length" class="home__hero">
        <HeroCarousel :offers="heroOffers" />
      </div>

      <HomeSection v-if="categoriesWithSlug.length" title="Categorias">
        <template v-if="canExpandCategories" #aside>
          <button type="button" data-test="home-cats-toggle" @click="catsExpanded = !catsExpanded">
            {{ catsExpanded ? 'Ver menos' : 'Ver todas' }}
          </button>
        </template>
        <CategoryGrid :categories="facets.categories" :expanded="catsExpanded" />
      </HomeSection>

      <HomeSection
        v-for="section in categorySections"
        :key="section.slug"
        :title="section.title"
        bleed
      >
        <template #aside>
          <NuxtLink :to="`/categoria/${section.slug}`">Ver todas</NuxtLink>
        </template>
        <OfferCarousel :offers="section.items" />
      </HomeSection>

      <HomeSection v-if="endingCount > 0 && endingItems.length" title="Termina hoje">
        <template #aside>
          <span class="home__pill">⏱ {{ endingCount }} {{ endingCount === 1 ? 'oferta' : 'ofertas' }}</span>
        </template>
        <div class="home__list">
          <OfferCard v-for="offer in endingItems" :key="offer.id" :offer="offer" />
        </div>
        <NuxtLink v-if="endingCount > endingItems.length" class="home__more" to="/?ends_today=1">
          Ver todas as {{ endingCount }} ofertas
        </NuxtLink>
      </HomeSection>
    </template>

    <AppBreadcrumb v-if="!isVitrine" :items="homeCrumbs" />

    <div v-if="!isVitrine && filters.state.value.ends_today" class="home__heading">
      <h1>Termina hoje</h1>
      <button type="button" class="home__clear" @click="filters.clear()">Limpar</button>
    </div>

    <HomeSection :title="isVitrine ? 'Novas ofertas' : ''">
      <section class="home__deals" aria-label="Ofertas em Joinville">
        <OfferCard
          v-for="offer in items"
          :key="offer.id"
          :offer="offer"
        />

        <div v-if="hasMore" ref="sentinelRef" class="home__sentinel" />

        <div v-if="loadingMore" class="home__loading home__loading--more" aria-live="polite">
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
    </HomeSection>
  </div>
</template>

<script setup lang="ts">
import { siteTrail } from '~/utils/breadcrumb'
import { categoryIcon } from '~/utils/categoryIcons'
import { jboGet, type JboFacets, type JboOffer, type JboOffersPage } from '~/utils/jboApi'
import {
  HOME_CAROUSEL_LIMIT,
  HOME_CAROUSEL_PAGE_SIZE,
  HOME_CATEGORY_SLUGS,
  HOME_HERO_LIMIT,
  HOME_HERO_PAGE_SIZE,
  isVitrineState,
  pickCategoryHighlights,
  pickHeroRotation,
} from '~/utils/homeVitrine'

type CountResponse = { count: number }

type CategoryPage = {
  category: { id: string, name: string, slug: string }
  items: JboOffer[]
  next_cursor: string | null
}

const filters = useOfferFilters()
const sentinelRef = ref<HTMLElement | null>(null)
const qDraft = ref(filters.state.value.q)
const activeCount = filters.activeCount
const config = useRuntimeConfig()

const extraItems = ref<JboOffer[]>([])
const nextCursor = ref<string | null>(null)
const loadingMore = ref(false)
const catsExpanded = ref(false)

/** Instante único para SSR e hidratação decidirem fase/hero com o mesmo "agora". */
const renderedAt = useState('home:rendered-at', () => new Date().toISOString())
const now = computed(() => new Date(renderedAt.value))

/** Semente única para SSR e hidratação sortearem o mesmo topo; troca a cada carregamento. */
const heroSeed = useState('home:hero-seed', () => Math.floor(Math.random() * 2 ** 31))

const isVitrine = computed(() => isVitrineState(filters.state.value))

const homeCrumbs = computed(() => {
  const state = filters.state.value
  const label = state.ends_today
    ? 'Termina hoje'
    : state.q
      ? 'Busca'
      : 'Ofertas'
  return siteTrail({ label })
})

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

const [
  facetsResult,
  offersResult,
  savingsResult,
  endingResult,
  endingCountResult,
  categoriesResult,
] = await Promise.all([
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
  useAsyncData(
    'jbo-home-savings',
    () => isVitrine.value
      ? jboGet<JboOffersPage>('/offers', { sort: 'savings', page_size: HOME_HERO_PAGE_SIZE }).catch(() => null)
      : Promise.resolve(null),
    { watch: [isVitrine] },
  ),
  useAsyncData(
    'jbo-home-ending',
    () => isVitrine.value
      ? jboGet<JboOffersPage>('/offers', { ends_today: true, sort: 'random', page_size: 6 }).catch(() => null)
      : Promise.resolve(null),
    { watch: [isVitrine] },
  ),
  useAsyncData(
    'jbo-home-ending-count',
    () => isVitrine.value
      ? jboGet<CountResponse>('/offers/count', { ends_today: true }).catch(() => null)
      : Promise.resolve(null),
    { watch: [isVitrine] },
  ),
  useAsyncData(
    'jbo-home-categories',
    () => isVitrine.value
      ? Promise.all(HOME_CATEGORY_SLUGS.map(slug =>
          jboGet<CategoryPage>(`/categories/${slug}`, { sort: 'savings', page_size: HOME_CAROUSEL_PAGE_SIZE })
            .catch(() => null),
        ))
      : Promise.resolve(null),
    { watch: [isVitrine] },
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

/** Seções da vitrine (vazias fora dela ou quando a chamada falhou). */
const savingsItems = computed<JboOffer[]>(() => savingsResult.data.value?.items || [])
/** Topo: até 5 ofertas com economia real, sorteadas do pool pela semente. */
const heroOffers = computed(() =>
  pickHeroRotation(savingsItems.value, heroSeed.value, HOME_HERO_LIMIT, now.value),
)
const endingItems = computed<JboOffer[]>(() => endingResult.data.value?.items || [])
const endingCount = computed(() => endingCountResult.data.value?.count ?? 0)
/** Carrosséis por categoria (economia): título com emoji, link e itens; vazios somem. */
const categorySections = computed(() => {
  const pages = categoriesResult.data.value || []
  return HOME_CATEGORY_SLUGS.flatMap((slug, index) => {
    const page = pages[index]
    if (!page) return []
    const items = pickCategoryHighlights(page.items || [], HOME_CAROUSEL_LIMIT, now.value)
    if (!items.length) return []
    return [{ slug, title: `${categoryIcon(slug).emoji} ${page.category.name}`, items }]
  })
})
const categoriesWithSlug = computed(() => facets.value.categories.filter(c => Boolean(c.slug)))
const canExpandCategories = computed(() => categoriesWithSlug.value.length > 8)

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
.home__hero {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px 16px 0;
}

.home__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.home__pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--red-soft);
  color: var(--red);
  font-size: 11px;
  font-weight: 700;
}

.home__more {
  display: block;
  margin-top: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--blue);
  text-align: center;
}

.home > :deep(.crumbs) {
  max-width: 720px;
  margin: 0 auto;
  padding: 14px 16px 0;
}

.home__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  max-width: 720px;
  margin: 0 auto;
  padding: 22px 16px 0;
}

.home__heading h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.home__clear {
  height: 34px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink-2);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.home__deals {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.home__sentinel {
  height: 1px;
}

.home__loading,
.home__empty,
.home__error {
  text-align: center;
  color: var(--ink-3);
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
