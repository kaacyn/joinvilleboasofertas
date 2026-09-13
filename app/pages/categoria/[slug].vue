<template>
  <div class="page">
    <AppHeader />
    <main v-if="data" class="page__main">
      <AppBreadcrumb :items="siteTrail({ label: data.category.name })" />
      <div class="page__heading">
        <span class="page__icon" :style="{ background: icon.bg }" aria-hidden="true">{{ icon.emoji }}</span>
        <h1>{{ data.category.name }}</h1>
      </div>
      <OfferCard
        v-for="offer in items"
        :key="offer.id"
        :offer="offer"
      />
      <div v-if="hasMore" ref="sentinelRef" class="page__sentinel" />
      <p v-if="loadingMore" class="page__loading" aria-live="polite">Carregando mais…</p>
      <p v-if="!items.length" class="empty">
        Sem ofertas vigentes nesta categoria.
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { siteTrail } from '~/utils/breadcrumb'
import { categoryIcon } from '~/utils/categoryIcons'
import { jboGet, type JboOffer } from '~/utils/jboApi'

type CatPage = {
  category: { id: string, name: string, slug: string }
  items: JboOffer[]
  next_cursor: string | null
}

const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data, error, pending } = await useAsyncData(
  () => `categoria-${slug.value}`,
  () => jboGet<CatPage>(`/categories/${slug.value}`),
  { watch: [slug] },
)

useSyncLoadingIndicator(pending)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Categoria não encontrada' })
}

useJboSeo({
  title: () =>
    data.value
      ? `${data.value.category.name} — ofertas em Joinville`
      : 'Categoria',
  description: () =>
    data.value
      ? `Ofertas da categoria ${data.value.category.name} em Joinville.`
      : '',
  path: () => `/categoria/${slug.value}`,
})

const icon = computed(() => categoryIcon(slug.value))

const sentinelRef = ref<HTMLElement | null>(null)
const extraItems = ref<JboOffer[]>([])
const nextCursor = ref<string | null>(null)
const loadingMore = ref(false)

const items = computed(() => [...(data.value?.items || []), ...extraItems.value])
const hasMore = computed(() => Boolean(nextCursor.value))

watch(data, (page) => {
  extraItems.value = []
  nextCursor.value = page?.next_cursor ?? null
}, { immediate: true })

/**
 * Carrega a próxima página do cursor; erro é silencioso (mantém o que já carregou).
 */
async function loadMore() {
  if (!nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const page = await jboGet<CatPage>(`/categories/${slug.value}`, {
      cursor: nextCursor.value,
      page_size: 20,
    })
    extraItems.value = [...extraItems.value, ...(page.items || [])]
    nextCursor.value = page.next_cursor
  }
  catch {
    nextCursor.value = null
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
.page__main {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.25rem 1rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.page__main :deep(.crumbs) {
  margin-bottom: 0;
}

.page__heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 0.5rem;
}

.page__icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  font-size: 26px;
}

h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.page__sentinel {
  height: 1px;
}

.page__loading,
.empty {
  text-align: center;
  color: var(--ink-3);
}
</style>
