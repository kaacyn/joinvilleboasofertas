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

      <section v-if="selected" class="proof" aria-label="Trecho do encarte">
        <div class="proof__frame">
          <img
            v-if="selected.image_url"
            class="proof__img"
            :src="selected.image_url"
            :alt="`Recorte do encarte de ${selected.product_name}`"
          >
          <div v-else class="proof__empty">
            Recorte do encarte indisponível.
          </div>
          <span class="proof__stamp">No encarte</span>
          <EncarteRefBadge :scan-id="selected.encarte_id" />
        </div>
        <button
          v-if="selected.encarte_id"
          type="button"
          class="proof__open"
          :disabled="openingEncarte"
          @click="openFullEncarte"
        >
          {{ openingEncarte ? 'Abrindo…' : 'Ver encarte inteiro' }}
        </button>
        <p v-if="encarteError" class="proof__error" role="status">
          Não foi possível abrir o encarte completo.
        </p>
      </section>

      <section v-if="selected" class="hero" aria-label="Oferta nesta loja">
        <div class="hero__price-stack">
          <p class="hero__price">
            {{ priceParts(selected).amount }}<span
              v-if="priceParts(selected).volumeSuffix"
              class="hero__price-vol"
            >/{{ priceParts(selected).volumeSuffix }}</span>
          </p>
          <p v-if="unitPriceLabel(selected)" class="hero__price-unit">
            {{ unitPriceLabel(selected) }}
          </p>
        </div>
        <p v-if="selected.is_club_price" class="hero__club">{{ clubHint }}</p>
        <p
          v-if="validityLabel(selected)"
          class="hero__validity"
          :class="{
            'hero__validity--expired': isPromoExpired(selected),
            'hero__validity--upcoming': isPromoUpcoming(selected),
          }"
        >
          {{ validityLabel(selected) }}
        </p>
        <ProductStoreBox :offer="selected" />
      </section>

      <section v-if="otherStores.length" class="list" aria-label="Preços por supermercado">
        <h2>Onde encontrar mais {{ data.product.name }}</h2>
        <NuxtLink
          v-for="offer in otherStores"
          :key="offer.id"
          class="row"
          :class="{
            'row--expired': isOfferExpired(offer),
            'row--upcoming': isPromoUpcoming(offer),
          }"
          :to="productOfferPath(offer)"
        >
          <span v-if="isOfferExpired(offer)" class="row__stripe">EXPIRADO</span>
          <span v-else-if="isPromoUpcoming(offer)" class="row__stripe row__stripe--upcoming">EM BREVE</span>
          <span class="row__body">
            <span class="row__store">
              <img
                v-if="offer.establishment_logo_url"
                class="row__logo"
                :src="offer.establishment_logo_url"
                :alt="`Logo ${offer.establishment_name}`"
              >
              <span
                v-else
                class="row__logo row__logo--fallback"
                aria-hidden="true"
              >{{ initials(offer.establishment_name) }}</span>
              <span>{{ offer.establishment_name }}</span>
            </span>
            <span class="row__price" :class="{ 'row__price--expired': isOfferExpired(offer) }">
              <span class="row__price-main">
                {{ priceParts(offer).amount }}<span
                  v-if="priceParts(offer).volumeSuffix"
                  class="row__price-vol"
                >/{{ priceParts(offer).volumeSuffix }}</span>
              </span>
              <span v-if="unitPriceLabel(offer)" class="row__price-unit">
                {{ unitPriceLabel(offer) }}
              </span>
            </span>
          </span>
        </NuxtLink>
      </section>

      <section v-if="related.length" class="related" aria-label="Outros produtos nesta loja">
        <h2>Outros produtos de {{ selected?.establishment_name }}</h2>
        <OfferCard
          v-for="offer in related"
          :key="offer.id"
          :offer="offer"
        />
      </section>
    </main>

    <EncarteLightbox
      v-if="openEncarte"
      :encarte="openEncarte"
      @close="openEncarte = null"
    />
  </div>
</template>

<script setup lang="ts">
import { clubPriceHint, jboGet, productOfferPath, type JboEncarte, type JboOffer, type JboOffersPage } from '~/utils/jboApi'
import {
  isOfferExpired,
  otherStoreOffers,
  relatedStoreOffers,
} from '~/utils/productPageLists'
import {
  formatPromoValidityLabel,
  isPromoExpired,
  isPromoUpcoming,
} from '~/utils/promoPhase'
import { formatOfferPrice, formatOfferPriceParts, formatUnitPrice } from '~/utils/unitPrice'

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
const lojaSlug = computed(() => {
  const raw = route.params.loja
  return raw ? String(raw) : ''
})
const config = useRuntimeConfig()
const openEncarte = ref<JboEncarte | null>(null)
const openingEncarte = ref(false)
const encarteError = ref(false)

const { data, error } = await useAsyncData(
  () => `product-${slug.value}`,
  () => jboGet<ProductPage>(`/products/${slug.value}`),
  { watch: [slug] },
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Produto não encontrado' })
}

if (data.value && !lojaSlug.value && data.value.cheapest?.establishment_slug) {
  await navigateTo(productOfferPath(data.value.cheapest), { redirectCode: 301, replace: true })
}

const selected = computed(() => {
  const offers = data.value?.offers || []
  if (lojaSlug.value) {
    return offers.find(offer => offer.establishment_slug === lojaSlug.value) || null
  }
  return data.value?.cheapest || offers[0] || null
})

const clubHint = computed(() =>
  selected.value ? clubPriceHint(selected.value) : '',
)

if (data.value && lojaSlug.value && !selected.value) {
  throw createError({ statusCode: 404, statusMessage: 'Oferta não encontrada nesta loja' })
}

const otherStores = computed(() =>
  otherStoreOffers(data.value?.offers || [], selected.value?.establishment_id),
)

const relatedQuery = computed(() => selected.value?.establishment_id || '')

const { data: relatedPage } = await useAsyncData(
  () => `related-${slug.value}-${relatedQuery.value}`,
  async () => {
    if (!relatedQuery.value) return { items: [] as JboOffer[], next_cursor: null }
    return jboGet<JboOffersPage>('/offers', {
      establishment_ids: relatedQuery.value,
      page_size: 24,
      sort: 'recent',
    })
  },
  { watch: [relatedQuery] },
)

const related = computed(() =>
  relatedStoreOffers(
    relatedPage.value?.items || [],
    data.value?.product.id,
    8,
    data.value?.product.category?.name,
  ),
)

watch(lojaSlug, () => {
  encarteError.value = false
})

/** Iniciais quando a loja ainda não tem logo. */
function initials(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

/**
 * Formata o preço da oferta (texto único, ex. SEO).
 */
function priceLabel(offer: JboOffer) {
  return formatOfferPrice(offer)
}

/**
 * Partes do preço para o volume ficar tipograficamente menor.
 */
function priceParts(offer: JboOffer) {
  return formatOfferPriceParts(offer)
}

/**
 * Preço por 100ml/100g/un quando a oferta tem normalização.
 */
function unitPriceLabel(offer: JboOffer) {
  return formatUnitPrice({
    priceVolumeMin: offer.price_volume_min,
    volumeUnitMin: offer.volume_unit_min,
    comparisonBase: offer.comparison_base,
  })
}

/**
 * Texto de validade da oferta selecionada.
 */
function validityLabel(offer: JboOffer) {
  return formatPromoValidityLabel(offer)
}

/**
 * Abre o encarte inteiro no lightbox a partir do recorte.
 */
async function openFullEncarte() {
  const encarteId = selected.value?.encarte_id
  if (!encarteId || openingEncarte.value) return

  openingEncarte.value = true
  encarteError.value = false
  try {
    openEncarte.value = await jboGet<JboEncarte>(`/encartes/${encarteId}`)
  }
  catch {
    encarteError.value = true
  }
  finally {
    openingEncarte.value = false
  }
}

useSeoMeta({
  title: () => {
    if (!data.value) return 'Produto'
    if (selected.value?.establishment_name) {
      return `${data.value.product.name} em ${selected.value.establishment_name}`
    }
    return `${data.value.product.name} — preços em Joinville`
  },
  description: () => {
    if (!data.value) return ''
    if (selected.value) {
      return `${data.value.product.name} por ${priceLabel(selected.value)} em ${selected.value.establishment_name}.`
    }
    return `Compare preços de ${data.value.product.name} nos supermercados de Joinville.`
  },
  ogImage: () => selected.value?.image_url || undefined,
})

watchEffect(() => {
  const offer = selected.value
  if (!offer || !data.value) return
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
            price: Number(offer.price),
            availability: 'https://schema.org/InStock',
            seller: {
              '@type': 'Organization',
              name: offer.establishment_name,
            },
            url: `${config.public.siteUrl}${productOfferPath(offer)}`,
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
  padding: 1.25rem 1rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.eyebrow {
  color: var(--muted);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

h1 {
  margin: 0;
  font-size: 1.65rem;
  font-weight: 900;
  line-height: 1.2;
}

.proof {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.proof__frame {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid var(--border);
  background:
    radial-gradient(circle at 20% 0%, rgba(255, 200, 0, 0.12), transparent 45%),
    var(--navy-light);
  min-height: 220px;
}

.proof__img {
  display: block;
  width: 100%;
  max-height: 420px;
  object-fit: contain;
  background: #0a0f17;
}

.proof__empty {
  display: grid;
  place-items: center;
  min-height: 220px;
  color: var(--muted);
  padding: 1rem;
  text-align: center;
}

.proof__stamp {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  background: var(--yellow);
  color: var(--navy);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.proof__open {
  align-self: center;
  min-width: 210px;
  border: 1px solid var(--yellow);
  border-radius: 12px;
  padding: 0.7rem 1rem;
  background: var(--yellow);
  color: var(--navy);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
}

.proof__open:disabled {
  cursor: wait;
  opacity: 0.7;
}

.proof__error {
  margin: 0;
  text-align: center;
  color: #ffb2b5;
  font-size: 0.82rem;
}

.hero {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.hero__price-stack {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.hero__price {
  margin: 0;
  font-size: 2.1rem;
  font-weight: 900;
  color: var(--yellow);
}

.hero__price-vol {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--muted);
  margin-left: 0.08rem;
}

.hero__price-unit {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--muted);
}

.hero__club,
.hero__validity {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}

.hero__validity--expired {
  color: rgba(255, 255, 255, 0.55);
}

.hero__validity--upcoming {
  color: var(--upcoming-light);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

h2 {
  margin: 0.4rem 0 0.15rem;
  font-size: 1rem;
  color: var(--yellow);
}

.row {
  display: flex;
  align-items: stretch;
  width: 100%;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: inherit;
  text-decoration: none;
}

.row--expired {
  opacity: 0.82;
}

.row__stripe {
  flex: 0 0 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  box-sizing: border-box;
  background: #3a4454;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.65rem;
  font-weight: 900;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  letter-spacing: 0.08em;
}

.row__stripe--upcoming {
  background: var(--upcoming);
  color: var(--white);
}

.row__body {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
  padding: 0.8rem 0.9rem;
}

.row__store {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  font-weight: 700;
  color: var(--white);
}

.row__logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 8px;
  background: #fff;
  border: 1px solid var(--border);
  flex: 0 0 auto;
}

.row__logo--fallback {
  display: grid;
  place-items: center;
  font-size: 0.68rem;
  font-weight: 900;
  color: var(--navy, #0a1f33);
  background: var(--yellow);
}

.row__price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
  font-weight: 900;
  color: var(--yellow);
  white-space: nowrap;
}

.row__price-vol {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--muted);
  margin-left: 0.04rem;
}

.row__price-unit {
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--muted);
  white-space: nowrap;
}

.row__price--expired {
  color: rgba(255, 255, 255, 0.65);
}

.related {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
</style>
