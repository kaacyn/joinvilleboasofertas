<template>
  <div class="page">
    <AppHeader />
    <main v-if="data" class="page__main">
      <p v-if="data.product.category" class="eyebrow">
        <NuxtLink :to="`/categoria/${data.product.category.slug}`">
          {{ data.product.category.name }}
        </NuxtLink>
      </p>
      <h1>{{ data.product.name }}</h1>

      <section v-if="data.cheapest" class="cheapest" aria-label="Mais barato">
        <h2>Mais barato agora</h2>
        <OfferCard :offer="data.cheapest" />
      </section>

      <section class="list" aria-label="Preços por supermercado">
        <h2>Preços por supermercado</h2>
        <OfferCard
          v-for="offer in data.offers"
          :key="offer.id"
          :offer="offer"
        />
        <p v-if="!data.offers.length" class="empty">
          Sem ofertas vigentes para este produto.
        </p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { jboGet, type JboOffer } from '~/utils/jboApi'

type ProductPage = {
  product: {
    id: string
    name: string
    slug: string
    category?: { id: string, name: string, slug: string } | null
  }
  cheapest: JboOffer | null
  offers: JboOffer[]
}

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const config = useRuntimeConfig()

const { data, error } = await useAsyncData(
  () => `product-${slug.value}`,
  () => jboGet<ProductPage>(`/products/${slug.value}`),
  { watch: [slug] },
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Produto não encontrado' })
}

useSeoMeta({
  title: () =>
    data.value
      ? `${data.value.product.name} — preços em Joinville`
      : 'Produto',
  description: () =>
    data.value
      ? `Compare preços de ${data.value.product.name} nos supermercados de Joinville.`
      : '',
})

watchEffect(() => {
  const cheapest = data.value?.cheapest
  if (!cheapest || !data.value) return
  useHead({
    script: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: data.value.product.name,
          offers: {
            '@type': 'Offer',
            priceCurrency: 'BRL',
            price: Number(cheapest.price),
            availability: 'https://schema.org/InStock',
            seller: {
              '@type': 'Organization',
              name: cheapest.establishment_name,
            },
            url: `${config.public.siteUrl}/oferta/${cheapest.id}`,
          },
        }),
      },
    ],
  })
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

.eyebrow {
  color: var(--muted);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 900;
}

h2 {
  margin: 0.5rem 0;
  font-size: 1rem;
  color: var(--yellow);
}

.cheapest,
.list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.empty {
  color: var(--muted);
}
</style>
