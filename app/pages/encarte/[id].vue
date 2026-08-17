<template>
  <div class="page">
    <AppHeader />
    <main v-if="encarte" class="page__main">
      <h1>Encarte {{ encarte.establishment_name }}</h1>
      <p class="meta">
        <NuxtLink class="meta__store" :to="`/loja/${encarte.establishment_slug}`">
          <img
            v-if="encarte.establishment_logo_url"
            class="meta__logo"
            :src="encarte.establishment_logo_url"
            :alt="`Logo ${encarte.establishment_name}`"
            loading="lazy"
          >
          <span>{{ encarte.establishment_name }}</span>
        </NuxtLink>
      </p>
      <p class="validity" :class="{ 'validity--expired': encarte.promo_active === false }">
        <template v-if="encarte.promo_active === false">
          Expirou em {{ formatDate(encarte.promo_ends_on) }}
        </template>
        <template v-else-if="encarte.promo_starts_on">
          De {{ formatDate(encarte.promo_starts_on) }} até {{ formatDate(encarte.promo_ends_on) }}
        </template>
        <template v-else>
          Válido até {{ formatDate(encarte.promo_ends_on) }}
        </template>
      </p>
      <p class="registered">
        {{ formatRegisteredAt(encarte.created_at, new Date(renderedAt)) }}
      </p>
      <img
        v-if="photoUrl"
        class="photo"
        :src="photoUrl"
        :alt="`Encarte ${encarte.establishment_name}`"
        loading="lazy"
      >
    </main>
  </div>
</template>

<script setup lang="ts">
import { jboGet, type JboEncarte } from '~/utils/jboApi'
import { formatRegisteredAt } from '~/utils/relativeTime'

const route = useRoute()
const id = computed(() => String(route.params.id))
const renderedAt = useState('encartes:rendered-at', () => new Date().toISOString())

const { data: encarte, error } = await useAsyncData(
  () => `encarte-${id.value}`,
  () => jboGet<JboEncarte>(`/encartes/${id.value}`),
  { watch: [id] },
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Encarte não encontrado' })
}

const photoUrl = computed(() => encarte.value?.image_url_xl || encarte.value?.image_url || '')

/** Formata uma data ISO curta sem conversão de fuso horário. */
function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso
}

const site = String(useRuntimeConfig().public.siteUrl || '').replace(/\/$/, '')

function absoluteOgImage(url?: string | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith('/')) return `${site}${url}`
  return url
}

useSeoMeta({
  title: () => `Encarte ${encarte.value?.establishment_name || ''} | Joinville Boas Ofertas`,
  ogImage: () => absoluteOgImage(encarte.value?.image_url_xl || encarte.value?.image_url), // og:image
  description: () => encarte.value
    ? `Encarte válido até ${formatDate(encarte.value.promo_ends_on)}`
    : undefined,
})
</script>

<style scoped>
.page__main {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.25rem 1rem 2rem;
}

h1 {
  margin: 0.25rem 0 0.5rem;
  font-size: 1.5rem;
  font-weight: 900;
}

.meta {
  color: var(--muted);
}

.meta__store {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: inherit;
  text-decoration: none;
}

.meta__store:hover {
  color: var(--yellow);
}

.meta__logo {
  width: 22px;
  height: 22px;
  object-fit: contain;
  border-radius: 5px;
  background: #fff;
}

.validity,
.registered {
  color: var(--muted);
  font-size: 0.9rem;
}

.validity--expired {
  color: rgba(255, 255, 255, 0.55);
}

.photo {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  margin: 1rem 0;
  border: 1px solid var(--border);
}
</style>
