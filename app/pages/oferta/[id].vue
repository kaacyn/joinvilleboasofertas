<template>
  <div class="page">
    <AppHeader />
    <main v-if="offer" class="page__main">
      <p v-if="offer.category_name" class="eyebrow">{{ offer.category_name }}</p>
      <h1>{{ offer.product_name }}</h1>
      <p class="meta">
        <NuxtLink :to="`/mercado/${offer.establishment_slug}`">
          {{ offer.establishment_name }}
        </NuxtLink>
      </p>
      <p class="price">{{ priceLabel }}</p>
      <p v-if="offer.is_club_price" class="club">Preço de clube</p>
      <p v-if="offer.promo_ends_on" class="validity">
        Válido até {{ offer.promo_ends_on }}
      </p>
      <img
        v-if="offer.image_url"
        class="photo"
        :src="offer.image_url"
        :alt="`Foto da oferta de ${offer.product_name}`"
        loading="lazy"
      >
      <p>
        <NuxtLink :to="`/produto/${offer.product_slug}`">
          Ver preços deste produto em outros mercados
        </NuxtLink>
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { jboGet, type JboOffer } from '~/utils/jboApi'

const route = useRoute()
const id = computed(() => String(route.params.id))

const { data: offer, error } = await useAsyncData(
  () => `offer-${id.value}`,
  () => jboGet<JboOffer>(`/offers/${id.value}`),
  { watch: [id] },
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Oferta não encontrada' })
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const priceLabel = computed(() =>
  offer.value ? BRL.format(Number(offer.value.price)) : '',
)

useSeoMeta({
  title: () =>
    offer.value
      ? `${offer.value.product_name} em ${offer.value.establishment_name}`
      : 'Oferta',
  description: () =>
    offer.value
      ? `Preço ${priceLabel.value} em ${offer.value.establishment_name}, Joinville.`
      : '',
})
</script>

<style scoped>
.page__main {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.25rem 1rem 2rem;
}

.eyebrow {
  color: var(--muted);
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

h1 {
  margin: 0.25rem 0 0.5rem;
  font-size: 1.5rem;
  font-weight: 900;
}

.meta {
  color: var(--muted);
}

.price {
  font-size: 2rem;
  font-weight: 900;
  color: var(--yellow);
  margin: 0.75rem 0;
}

.club,
.validity {
  color: var(--muted);
  font-size: 0.9rem;
}

.photo {
  display: block;
  width: 100%;
  border-radius: 12px;
  margin: 1rem 0;
  border: 1px solid var(--border);
}
</style>
