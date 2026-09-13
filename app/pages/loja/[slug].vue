<template>
  <div class="page">
    <AppHeader />
    <main v-if="data" class="page__main">
      <AppBreadcrumb :items="siteTrail({ label: 'Lojas', to: '/lojas' }, { label: data.establishment.name })" />
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
        <div class="loja-head__body">
          <div class="loja-head__text">
            <h1>{{ data.establishment.name }}</h1>
            <p v-if="data.establishment.address" class="addr">
              {{ data.establishment.address }}
            </p>
          </div>
          <StoreFollowBell
            :establishment-id="data.establishment.id"
            :store-name="data.establishment.name"
            show-hint
          />
        </div>
      </header>
      <OfferCard
        v-for="offer in data.items"
        :key="offer.id"
        :offer="offer"
        hide-store
      />
      <p v-if="!data.items.length" class="empty">Sem ofertas vigentes nesta loja.</p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { siteTrail } from '~/utils/breadcrumb'
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
const config = useRuntimeConfig()
const slug = computed(() => String(route.params.slug))

const { data, error, pending } = await useAsyncData(
  () => `loja-${slug.value}`,
  () => jboGet<EstPage>(`/establishments/${slug.value}`),
  { watch: [slug] },
)

useSyncLoadingIndicator(pending)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Loja não encontrada' })
}

function initials(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

useJboSeo({
  title: () =>
    data.value
      ? `Ofertas em ${data.value.establishment.name} | Joinville`
      : 'Loja',
  description: () =>
    data.value
      ? `Preços vigentes em ${data.value.establishment.name}, Joinville.`
      : '',
  path: () => `/loja/${slug.value}`,
  image: () => data.value?.establishment.logo_url,
  jsonLd: () => {
    if (!data.value) return null
    const est = data.value.establishment
    const site = String(config.public.siteUrl || '').replace(/\/$/, '')
    return {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: est.name,
      url: `${site}/loja/${est.slug}`,
      ...(est.address
        ? {
            address: {
              '@type': 'PostalAddress',
              streetAddress: est.address,
              addressLocality: 'Joinville',
              addressCountry: 'BR',
            },
          }
        : {}),
    }
  },
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

h1 {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 900;
  min-width: 0;
}

.loja-head__body {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
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
  background: var(--surface);
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
  flex: 1;
  min-width: 0;
}

.addr {
  margin: 0.2rem 0 0;
}

.addr,
.empty {
  color: var(--muted);
}
</style>
