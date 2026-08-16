<template>
  <div class="page">
    <AppHeader />
    <main v-if="data" class="page__main">
      <header class="loja-head">
        <img
          v-if="data.establishment.logo_url"
          class="loja-head__logo"
          :src="data.establishment.logo_url"
          :alt="`Logo ${data.establishment.name}`"
        >
        <span
          v-else
          class="loja-head__logo loja-head__logo--fallback"
          aria-hidden="true"
        >{{ initials(data.establishment.name) }}</span>
        <div class="loja-head__text">
          <h1>{{ data.establishment.name }}</h1>
          <p v-if="data.establishment.address" class="addr">
            {{ data.establishment.address }}
          </p>
        </div>
      </header>
      <OfferCard
        v-for="offer in data.items"
        :key="offer.id"
        :offer="offer"
      />
      <p v-if="!data.items.length" class="empty">Sem ofertas vigentes nesta loja.</p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { jboGet, type JboOffer } from '~/utils/jboApi'

type EstPage = {
  establishment: {
    id: string
    name: string
    slug: string
    address: string
    logo_url?: string | null
  }
  items: JboOffer[]
  next_cursor: string | null
}

const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data, error } = await useAsyncData(
  () => `loja-${slug.value}`,
  () => jboGet<EstPage>(`/establishments/${slug.value}`),
  { watch: [slug] },
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Loja não encontrada' })
}

function initials(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

useSeoMeta({
  title: () =>
    data.value
      ? `Ofertas em ${data.value.establishment.name} | Joinville`
      : 'Loja',
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

.loja-head {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.loja-head__logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
  border-radius: 14px;
  background: #fff;
  border: 1px solid var(--border);
  flex: 0 0 auto;
}

.loja-head__logo--fallback {
  display: grid;
  place-items: center;
  font-size: 0.95rem;
  font-weight: 900;
  color: var(--navy, #0a1f33);
  background: var(--yellow);
}

.loja-head__text {
  min-width: 0;
}

.addr,
.empty {
  color: var(--muted);
}
</style>
