<template>
  <div class="page">
    <AppHeader />
    <main v-if="data" class="page__main">
      <h1>{{ data.establishment.name }}</h1>
      <p v-if="data.establishment.address" class="addr">
        {{ data.establishment.address }}
      </p>
      <OfferCard
        v-for="offer in data.items"
        :key="offer.id"
        :offer="offer"
      />
      <p v-if="!data.items.length" class="empty">Sem ofertas vigentes neste mercado.</p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { jboGet, type JboOffer } from '~/utils/jboApi'

type EstPage = {
  establishment: { id: string, name: string, slug: string, address: string }
  items: JboOffer[]
  next_cursor: string | null
}

const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data, error } = await useAsyncData(
  () => `mercado-${slug.value}`,
  () => jboGet<EstPage>(`/establishments/${slug.value}`),
  { watch: [slug] },
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Mercado não encontrado' })
}

useSeoMeta({
  title: () =>
    data.value
      ? `Ofertas em ${data.value.establishment.name} | Joinville`
      : 'Mercado',
  description: () =>
    data.value
      ? `Preços vigentes em ${data.value.establishment.name}, Joinville.`
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
  margin: 0;
  font-size: 1.45rem;
  font-weight: 900;
}

.addr,
.empty {
  color: var(--muted);
}
</style>
