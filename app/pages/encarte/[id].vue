<template>
  <div class="page">
    <AppHeader />
    <main v-if="encarte" class="page__main">
      <div class="heading">
        <h1>Encarte {{ encarte.establishment_name }}</h1>
        <button
          type="button"
          class="bell"
          aria-label="Receber avisos desta loja"
          :aria-pressed="isFollowing(encarte.establishment_id) ? 'true' : 'false'"
          @click="onBell"
        >
          <svg class="bell-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M12 3a6 6 0 0 0-6 6v2.7L4.2 15a1.2 1.2 0 0 0 1 1.9h13.6a1.2 1.2 0 0 0 1-1.9L18 11.7V9a6 6 0 0 0-6-6zm0 18a2.8 2.8 0 0 1-2.7-2h5.4A2.8 2.8 0 0 1 12 21z" />
          </svg>
        </button>
        <button
          type="button"
          class="share"
          aria-label="Compartilhar encarte"
          @click="onShare"
        >
          ⋯
        </button>
      </div>
      <p
        v-if="followHint && encarte && hintFor === encarte.establishment_id"
        class="bell-hint"
        aria-live="polite"
      >{{ followHint }}</p>
      <p class="copied" aria-live="polite">{{ copied ? 'Link copiado' : '' }}</p>
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
import { shareEncarte } from '~/utils/shareEncarte'

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

const { isFollowing, toggle, hint: followHint, hintFor } = useJboStoreFollow()

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

/** Liga ou desliga avisos da loja deste encarte. */
async function onBell() {
  if (!encarte.value) return
  await toggle(encarte.value.establishment_id)
}

/** Folha nativa ou copiar link `{origin}/encarte/{id}`. */
async function onShare() {
  if (!encarte.value) return
  const origin = import.meta.client ? window.location.origin : ''
  const result = await shareEncarte({
    title: encarte.value.establishment_name,
    text: 'Encarte',
    url: `${origin}/encarte/${encarte.value.id}`,
  }).catch(() => undefined)
  if (result !== 'copied') return
  copied.value = true
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copied.value = false
  }, 2000)
}

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

.heading {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

h1 {
  flex: 1;
  margin: 0.25rem 0 0.5rem;
  font-size: 1.5rem;
  font-weight: 900;
}

.bell,
.share {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  margin-top: 0.15rem;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--navy-light);
  color: var(--yellow);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.bell-icon {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linejoin: round;
}

.bell[aria-pressed="true"] .bell-icon {
  fill: currentColor;
}

.bell:hover,
.share:hover {
  border-color: var(--yellow);
}

.bell:focus-visible,
.share:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
}

.bell-hint {
  margin: 0 0 0.35rem;
  color: var(--muted);
  font-size: 0.85rem;
}

.copied {
  min-height: 1.2em;
  margin: 0 0 0.35rem;
  color: var(--muted);
  font-size: 0.85rem;
}

.copied:empty {
  display: none;
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
