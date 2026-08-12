<template>
  <div class="page">
    <AppHeader />
    <main v-if="data" class="page__main">
      <h1>{{ data.category.name }}</h1>
      <OfferCard
        v-for="offer in data.items"
        :key="offer.id"
        :offer="offer"
      />
      <p v-if="!data.items.length" class="empty">
        Sem ofertas vigentes nesta categoria.
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { jboGet, type JboOffer } from '~/utils/jboApi'

type CatPage = {
  category: { id: string, name: string, slug: string }
  items: JboOffer[]
  next_cursor: string | null
}

const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data, error } = await useAsyncData(
  () => `categoria-${slug.value}`,
  () => jboGet<CatPage>(`/categories/${slug.value}`),
  { watch: [slug] },
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Categoria não encontrada' })
}

useSeoMeta({
  title: () =>
    data.value
      ? `${data.value.category.name} — ofertas em Joinville`
      : 'Categoria',
  description: () =>
    data.value
      ? `Ofertas da categoria ${data.value.category.name} em Joinville.`
      : '',
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

h1 {
  margin: 0 0 0.5rem;
  font-size: 1.45rem;
  font-weight: 900;
}

.empty {
  color: var(--muted);
}
</style>
