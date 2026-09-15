<template>
  <div class="page">
    <AppHeader />
    <main v-if="data" class="page__main">
      <AppBreadcrumb :items="crumbs" />
      <ProductActionsBar
        v-if="selected"
        :offer="selected"
        :offers="data.offers"
        :product-title="productTitle"
        :share-path="sharePath"
      />
      <h1>{{ productTitle }}</h1>

      <section v-if="selected" class="proof" aria-label="Trecho do encarte">
        <div
          class="proof__frame"
          :class="{ 'proof__frame--clickable': selected.encarte_id }"
          :role="selected.encarte_id ? 'button' : undefined"
          :tabindex="selected.encarte_id ? 0 : undefined"
          :aria-label="selected.encarte_id ? 'Ver no encarte' : undefined"
          @click="selected.encarte_id && openFullEncarte()"
          @keydown.enter.prevent="selected.encarte_id && openFullEncarte()"
        >
          <img
            v-if="selected.image_url"
            class="proof__img"
            :src="selected.image_url"
            :alt="`Recorte do encarte de ${productTitle}`"
          >
          <div v-else class="proof__empty">
            Recorte do encarte indisponível.
          </div>
          <span class="proof__stamp">No encarte</span>
          <EncarteRefBadge :scan-id="selected.encarte_id" />
        </div>
        <p v-if="selected.encarte_id" class="proof__hint">
          Verifique todas as condições no encarte
        </p>
        <button
          v-if="selected.encarte_id"
          type="button"
          class="proof__open"
          data-test="product-open-encarte"
          :disabled="openingEncarte"
          @click="openFullEncarte"
        >
          {{ openingEncarte ? 'Abrindo…' : 'Ver no encarte' }}
        </button>
        <p v-if="encarteError" class="proof__error" role="status">
          Não foi possível abrir o encarte completo.
        </p>
      </section>

      <section v-if="selected" class="hero" aria-label="Oferta nesta loja">
        <div class="price-box" aria-label="Preço da oferta">
          <div class="price-box__row">
            <div class="price-box__main">
              <p class="hero__price">
                <span v-if="priceParts(selected).prefix" class="hero__price-prefix">{{ priceParts(selected).prefix }} </span>{{ priceParts(selected).amount }}<span
                  v-if="priceParts(selected).suffix"
                  class="hero__price-vol"
                >{{ priceParts(selected).suffix }}</span>
              </p>
              <p v-if="priceParts(selected).each" class="hero__price-unit">
                {{ priceParts(selected).each }}
              </p>
              <p v-if="unitPriceLabel(selected)" class="hero__price-unit">
                {{ unitPriceLabel(selected) }}
              </p>
            </div>
            <div v-if="clubHint" class="price-box__club-wrap">
              <span class="price-box__club">{{ clubHint }}</span>
              <s
                v-if="priceParts(selected).regular"
                class="price-box__regular"
                :title="`${priceParts(selected).regular} sem o clube`"
              >{{ priceParts(selected).regular }} sem clube</s>
            </div>
          </div>
          <ul v-if="chips.length" class="hero__chips" aria-label="Condições da oferta">
            <li
              v-for="chip in chips"
              :key="chip.key"
              class="hero__chip"
              :class="`hero__chip--${chip.key}`"
              :title="chip.title"
            >
              {{ chip.label }}
            </li>
          </ul>
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
        </div>
        <ProductStoreBox :offer="selected" />
      </section>

      <section v-if="otherStores.length" class="list" aria-label="Preços por supermercado">
        <h2 class="section-heading">Onde encontrar mais {{ productTitle }}</h2>
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
                <span v-if="priceParts(offer).prefix" class="row__price-prefix">{{ priceParts(offer).prefix }} </span>{{ priceParts(offer).amount }}<span
                  v-if="priceParts(offer).suffix"
                  class="row__price-vol"
                >{{ priceParts(offer).suffix }}</span>
              </span>
              <span v-if="priceParts(offer).isClub" class="row__price-club">{{ clubBadgeLabel(offer) }}</span>
              <span v-if="unitPriceLabel(offer)" class="row__price-unit">
                {{ unitPriceLabel(offer) }}
              </span>
            </span>
          </span>
        </NuxtLink>
      </section>

      <section v-if="related.length" class="related" aria-label="Outros produtos nesta loja">
        <h2 class="section-heading">
          Outros produtos de {{ selected?.establishment_name }}
        </h2>
        <OfferCard
          v-for="offer in related"
          :key="offer.id"
          :offer="offer"
          hide-store
        />
        <NuxtLink
          v-if="selected?.establishment_slug"
          class="related__all"
          :to="`/loja/${selected.establishment_slug}`"
        >
          Veja todos os produtos do supermercado
        </NuxtLink>
      </section>
    </main>

    <EncarteLightbox
      v-if="openEncarte"
      :encarte="openEncarte"
      :highlight="selected?.encarte_bbox || null"
      @close="openEncarte = null"
    />
  </div>
</template>

<script setup lang="ts">
import { clubBadgeLabel, clubPriceHint, jboGet, productOfferPath, type JboEncarte, type JboOffer, type JboOffersPage } from '~/utils/jboApi'
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
import {
  formatOfferPrice,
  formatOfferPriceParts,
  formatUnitPrice,
  offerChips,
  offerMainPrice,
} from '~/utils/offerPrice'
import { offerTitle } from '~/utils/offerTitle'
import { siteTrail } from '~/utils/breadcrumb'

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
/** Título completo do produto (nome + marca + volume) a partir da oferta em foco. */
const productTitle = computed(() => {
  const source = selected.value || data.value?.cheapest || null
  return offerTitle({
    product_name: data.value?.product.name || '',
    brand: source?.brand,
    quantity_label: source?.quantity_label,
  })
})

/** Caminho canônico do produto no mercado em foco (compartilhar). */
const sharePath = computed(() => productOfferPath({
  product_id: data.value?.product.id || '',
  product_slug: data.value?.product.slug,
  establishment_slug: selected.value?.establishment_slug || lojaSlug.value || '',
}))

/** Início → categoria → mercado → produto (página atual, sem link). */
const crumbs = computed(() => {
  const items = []
  const category = data.value?.product.category
  if (category?.slug && category.name) {
    items.push({ label: category.name, to: `/categoria/${category.slug}` })
  }
  const store = selected.value
  if (store?.establishment_slug && store.establishment_name) {
    items.push({
      label: store.establishment_name,
      to: `/loja/${store.establishment_slug}`,
    })
  }
  if (productTitle.value) items.push({ label: productTitle.value })
  return siteTrail(...items)
})
const chips = computed(() => (selected.value ? offerChips(selected.value) : []))

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
      page_size: 12,
      sort: 'recent',
    })
  },
  { watch: [relatedQuery] },
)

const related = computed(() =>
  relatedStoreOffers(
    relatedPage.value?.items || [],
    data.value?.product.id,
    5,
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
 * Preço por 100 ml/100 g/un quando a oferta tem base de comparação.
 */
function unitPriceLabel(offer: JboOffer) {
  return formatUnitPrice(offer)
}

/**
 * Texto de validade da oferta selecionada.
 */
function validityLabel(offer: JboOffer) {
  return formatPromoValidityLabel(offer)
}

/**
 * Abre o encarte inteiro no lightbox, já com a oferta destacada na foto.
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

useJboSeo({
  title: () => {
    if (!data.value) return 'Produto'
    if (selected.value?.establishment_name) {
      return `${productTitle.value} em ${selected.value.establishment_name}`
    }
    return `${productTitle.value} — preços em Joinville`
  },
  description: () => {
    if (!data.value) return ''
    if (selected.value) {
      return `${productTitle.value} por ${priceLabel(selected.value)} em ${selected.value.establishment_name}.`
    }
    return `Compare preços de ${productTitle.value} nos supermercados de Joinville.`
  },
  path: () => {
    if (selected.value) return productOfferPath(selected.value)
    const s = String(route.params.slug || '')
    return s ? `/produto/${s}` : '/'
  },
  image: () => selected.value?.image_url || undefined,
  jsonLd: () => {
    const offer = selected.value
    const main = offer ? offerMainPrice(offer) : null
    if (!offer || !data.value || !main) return null
    const site = String(config.public.siteUrl || '').replace(/\/$/, '')
    const pageUrl = `${site}${productOfferPath(offer)}`
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: productTitle.value,
        brand: offer.brand ? { '@type': 'Brand', name: offer.brand } : undefined,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'BRL',
          price: main.value,
          availability: 'https://schema.org/InStock',
          seller: {
            '@type': 'Organization',
            name: offer.establishment_name,
          },
          url: pageUrl,
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.value.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.label,
          item: `${site}${item.to || productOfferPath(offer)}`,
        })),
      },
    ]
  },
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

.page__main :deep(.crumbs) {
  margin-bottom: -0.45rem;
}

.page__main :deep(.product-actions) {
  margin-bottom: -0.5rem;
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
  background: var(--surface);
  min-height: 220px;
}

.proof__frame--clickable {
  cursor: zoom-in;
}

.proof__frame--clickable:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
}

.proof__img {
  display: block;
  width: 100%;
  max-height: 420px;
  object-fit: contain;
  background: #EEF0F3;
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

.proof__hint {
  margin: 0 0 -0.35rem;
  text-align: center;
  color: var(--muted);
  font-size: 0.75rem;
  line-height: 1.35;
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
  color: var(--red);
  font-size: 0.82rem;
}

.hero {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.price-box {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 1rem 1.05rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
}

.price-box__row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.65rem 1rem;
}

.price-box__main {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.hero__price {
  margin: 0;
  font-size: 2.1rem;
  font-weight: 900;
  color: var(--ink);
  line-height: 1.15;
}

.hero__price-prefix {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ink);
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

.price-box__club {
  flex: 0 0 auto;
  align-self: center;
  padding: 0.3rem 0.55rem;
  border-radius: 6px;
  background: var(--yellow-soft);
  color: var(--yellow-ink);
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1.2;
}

.price-box__club-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  align-self: center;
}

.price-box__regular {
  color: var(--muted);
  font-size: 0.8rem;
}

.hero__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.hero__chip {
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--ink);
  font-size: 0.75rem;
  font-weight: 700;
}

.hero__chip--promotion {
  border-color: var(--yellow);
  color: var(--yellow-ink);
}

.hero__chip--addresses {
  color: var(--muted);
}

.hero__validity {
  margin: 0;
  padding-top: 0.55rem;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 0.9rem;
}

.hero__validity--expired {
  color: var(--ink-3);
}

.hero__validity--upcoming {
  color: var(--blue);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

h2,
.section-heading {
  margin: 0.4rem 0 0.15rem;
  font-size: 1rem;
  color: var(--ink);
  text-transform: uppercase;
  letter-spacing: 0.03em;
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
  background: #EEF0F3;
  color: var(--ink-2);
  font-size: 0.65rem;
  font-weight: 900;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  letter-spacing: 0.08em;
}

.row__stripe--upcoming {
  background: var(--blue-soft);
  color: var(--blue);
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
  color: var(--ink);
}

.row__logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 8px;
  background: var(--surface);
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
  color: var(--ink);
  white-space: nowrap;
}

.row__price-prefix {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--ink);
}

.row__price-club {
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--yellow-ink);
  background: var(--yellow-soft);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
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
  color: var(--ink-3);
}

.related {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.related__all {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.35rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink-2);
  font-size: 0.95rem;
  font-weight: 700;
  text-align: center;
  text-decoration: none;
}

.related__all:hover {
  border-color: var(--ink-3);
}
</style>
