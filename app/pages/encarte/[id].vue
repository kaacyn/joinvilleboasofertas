<template>
  <div class="page">
    <AppHeader />
    <main v-if="encarte" class="page__main">
      <AppBreadcrumb :items="encarteCrumbs" />
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
      <p
        class="validity"
        :class="{
          'validity--expired': isExpired,
          'validity--upcoming': isUpcoming,
          'validity--hot': endingToday,
        }"
      >
        {{ validityLabel }}
      </p>
      <p v-if="isExpired" class="phase-badge phase-badge--expired">Expirado</p>
      <p v-else-if="isUpcoming" class="phase-badge phase-badge--upcoming">Em breve</p>
      <p v-else-if="endingToday" class="phase-badge phase-badge--hot">Termina hoje</p>
      <p class="registered">
        {{ formatRegisteredAt(encarte.created_at, new Date(renderedAt)) }}
      </p>
      <div v-if="photoUrl" class="photo">
        <button
          type="button"
          class="photo__open"
          aria-label="Ampliar encarte"
          data-test="encarte-open"
          @click="openLightbox(null)"
        >
          <img
            class="photo__img"
            :src="photoUrl"
            :alt="`Encarte ${encarte.establishment_name}`"
            loading="lazy"
          >
        </button>
        <EncarteRefBadge :scan-id="encarte.id" />
      </div>

      <section v-if="offers.length" class="offers" aria-label="Ofertas deste encarte">
        <h2 class="section-heading">Ofertas deste encarte</h2>
        <p class="offers__hint">
          {{ hotspots.length ? 'Toque na foto para ver onde cada oferta está no encarte.' : 'Preços extraídos do encarte; confira as condições na foto.' }}
        </p>
        <div
          v-for="offer in offers"
          :id="`oferta-${offer.id}`"
          :key="offer.id"
          class="offers__item"
          :class="{ 'offers__item--flash': flashId === offer.id }"
        >
          <OfferCard :offer="offer" hide-store />
          <button
            v-if="offer.encarte_bbox"
            type="button"
            class="offers__locate"
            :data-test="`offer-locate-${offer.id}`"
            @click="openLightbox(offer.id)"
          >
            Ver no encarte
          </button>
        </div>
      </section>
    </main>

    <EncarteLightbox
      v-if="lightboxOpen && encarte"
      :encarte="encarte"
      :highlight="highlightBox"
      :hotspots="hotspots"
      :active-id="activeOfferId"
      @close="lightboxOpen = false"
      @select="onSelectOffer"
    />
  </div>
</template>

<script setup lang="ts">
import type { EncarteHotspot } from '~/components/encartes/EncarteLightbox.vue'
import { formatOfferPrice } from '~/utils/offerPrice'
import { offerTitle } from '~/utils/offerTitle'
import { jboGet, type JboEncarte, type JboEncarteOffers, type JboOffer } from '~/utils/jboApi'
import {
  formatPromoValidityLabel,
  getPromoPhase,
  isEndingToday,
  isPromoExpired,
} from '~/utils/promoPhase'
import { formatRegisteredAt } from '~/utils/relativeTime'
import { shareEncarte } from '~/utils/shareEncarte'
import { siteTrail } from '~/utils/breadcrumb'

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

const encarteCrumbs = computed(() => {
  const item = encarte.value
  const steps = [{ label: 'Encartes', to: '/encartes' }]
  if (item?.establishment_slug && item.establishment_name) {
    steps.push({
      label: item.establishment_name,
      to: `/loja/${item.establishment_slug}`,
    })
  }
  steps.push({ label: 'Encarte' })
  return siteTrail(...steps)
})

const { data: offersPage } = await useAsyncData(
  () => `encarte-offers-${id.value}`,
  () => jboGet<JboEncarteOffers>(`/encartes/${id.value}/offers`).catch(() => ({ items: [] as JboOffer[] })),
  { watch: [id] },
)

const offers = computed<JboOffer[]>(() => offersPage.value?.items || [])

/** Ofertas com posição conhecida viram áreas clicáveis sobre a foto. */
const hotspots = computed<EncarteHotspot[]>(() =>
  offers.value
    .filter(offer => offer.encarte_bbox)
    .map(offer => ({
      id: offer.id,
      bbox: offer.encarte_bbox!,
      label: `${offerTitle(offer)} · ${formatOfferPrice(offer)}`,
    })),
)

const lightboxOpen = ref(false)
const activeOfferId = ref<string | null>(null)
const flashId = ref<string | null>(null)
let flashTimer: ReturnType<typeof setTimeout> | undefined

const highlightBox = computed(() => {
  if (!activeOfferId.value) return null
  return offers.value.find(offer => offer.id === activeOfferId.value)?.encarte_bbox || null
})

/** Abre a foto ampliada, opcionalmente já destacando uma oferta. */
function openLightbox(offerId: string | null) {
  activeOfferId.value = offerId
  lightboxOpen.value = true
}

/** Hotspot clicado: fecha a foto e rola até o card da oferta. */
function onSelectOffer(offerId: string) {
  lightboxOpen.value = false
  activeOfferId.value = offerId
  flashId.value = offerId
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashId.value = null
  }, 2400)
  if (import.meta.client) {
    nextTick(() => {
      document.getElementById(`oferta-${offerId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }
}

const photoUrl = computed(() => encarte.value?.image_url_xl || encarte.value?.image_url || '')
const promoPhase = computed(() =>
  encarte.value ? getPromoPhase(encarte.value) : 'active',
)
const isExpired = computed(() =>
  encarte.value ? isPromoExpired(encarte.value) : false,
)
const isUpcoming = computed(() => promoPhase.value === 'upcoming')
const endingToday = computed(() =>
  encarte.value ? isEndingToday(encarte.value) : false,
)
const validityLabel = computed(() =>
  encarte.value ? formatPromoValidityLabel(encarte.value) : '',
)

const { isFollowing, requestToggle, hint: followHint, hintFor } = useJboStoreFollow()

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

/** Liga ou desliga avisos da loja deste encarte. */
async function onBell() {
  if (!encarte.value) return
  await requestToggle(encarte.value.establishment_id, encarte.value.establishment_name)
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

useJboSeo({
  title: () => `Encarte ${encarte.value?.establishment_name || ''} | Joinville Boas Ofertas`,
  description: () => encarte.value
    ? `Encarte ${formatValidUntil(encarte.value.promo_ends_on).toLowerCase()}`
    : '',
  path: () => `/encarte/${String(route.params.id)}`,
  image: () => encarte.value?.image_url_xl || encarte.value?.image_url,
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
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink-2);
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

.bell[aria-pressed="true"] {
  background: var(--yellow-soft);
  border-color: var(--yellow);
  color: var(--yellow-ink);
}

.bell:hover,
.share:hover {
  border-color: var(--ink-3);
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
  color: var(--ink);
}

.meta__logo {
  width: 22px;
  height: 22px;
  object-fit: contain;
  border-radius: 5px;
  background: var(--surface);
}

.validity,
.registered {
  color: var(--muted);
  font-size: 0.9rem;
}

.validity--expired {
  color: var(--ink-3);
}

.validity--upcoming {
  color: var(--blue);
}

.validity--hot {
  color: var(--red);
  font-weight: 600;
}

.phase-badge {
  margin: 0.35rem 0 0;
  padding: 0.2rem 0.45rem;
  width: fit-content;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.phase-badge--expired {
  background: #EEF0F3;
  color: var(--ink-2);
}

.phase-badge--upcoming {
  background: var(--blue-soft);
  color: var(--blue);
}

.phase-badge--hot {
  background: var(--red-soft);
  color: var(--red);
}

.photo {
  position: relative;
  display: block;
  margin: 1rem 0;
  overflow: hidden;
  border-radius: 12px;
}

.photo__open {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  cursor: zoom-in;
}

.photo__open:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
  border-radius: 12px;
}

.photo__img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  border: 1px solid var(--line);
}

.offers {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 0.5rem;
}

.section-heading {
  margin: 0.4rem 0 0;
  font-size: 1rem;
  color: var(--ink);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.offers__hint {
  margin: 0 0 0.25rem;
  color: var(--muted);
  font-size: 0.85rem;
}

.offers__item {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  border-radius: 12px;
  transition: box-shadow 0.3s ease;
}

.offers__item--flash {
  box-shadow: 0 0 0 3px var(--yellow);
}

.offers__locate {
  align-self: flex-end;
  margin: 0;
  padding: 0.2rem 0.1rem;
  border: 0;
  background: none;
  color: var(--blue);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.offers__locate:hover,
.offers__locate:focus-visible {
  text-decoration: underline;
}
</style>
