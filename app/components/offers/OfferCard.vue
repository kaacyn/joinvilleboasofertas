<template>
  <NuxtLink
    class="deal"
    :class="{ 'deal--expired': isExpired }"
    :to="productHref"
  >
    <div
      class="deal__stripe"
      :class="stripeClass"
    >
      <template v-if="isExpired">
        <span class="deal__stripe-main deal__stripe-main--word">EXPIRADO</span>
      </template>
      <template v-else-if="isUpcoming">
        <span class="deal__stripe-main deal__stripe-main--word">EM BREVE</span>
      </template>
      <template v-else-if="hasSavings">
        <span class="deal__stripe-label">economia</span>
        <span class="deal__stripe-main">{{ pctLabel }}</span>
      </template>
      <span v-else class="deal__stripe-main deal__stripe-main--word">OFERTA</span>
    </div>

    <div class="deal__body">
      <div v-if="offer.category_name" class="deal__category">
        {{ offer.category_name }}
      </div>
      <div class="deal__name">
        {{ offer.product_name }}
      </div>
      <div class="deal__meta">
        <span class="deal__store">
          <img
            v-if="offer.establishment_logo_url"
            class="deal__store-logo"
            :src="offer.establishment_logo_url"
            :alt="`Logo ${offer.establishment_name}`"
            loading="lazy"
          >
          <span>{{ offer.establishment_name }}</span>
        </span>
      </div>
      <p
        v-if="validityLabel"
        class="deal__validity"
        :class="{ 'deal__validity--expired': isExpired, 'deal__validity--upcoming': isUpcoming }"
      >
        {{ validityLabel }}
      </p>
      <div class="deal__price">
        <div class="deal__price-stack">
          <span class="deal__price-now">{{ priceLabel }}</span>
          <span v-if="unitPriceLabel" class="deal__price-unit">{{ unitPriceLabel }}</span>
        </div>
        <span v-if="offer.is_club_price" class="deal__club">{{ clubLabel }}</span>
        <span v-if="hasSavings && avgLabel" class="deal__price-avg">
          média {{ avgLabel }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { clubBadgeLabel, productOfferPath, type JboOffer } from '~/utils/jboApi'
import { formatOfferPrice, formatUnitPrice } from '~/utils/unitPrice'
import {
  formatPromoValidityLabel,
  getPromoPhase,
  isPromoExpired,
} from '~/utils/promoPhase'

const props = defineProps<{ offer: JboOffer }>()

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const clubLabel = computed(() => clubBadgeLabel(props.offer))
const productHref = computed(() => productOfferPath(props.offer))
const promoPhase = computed(() => getPromoPhase(props.offer))
const isExpired = computed(() => isPromoExpired(props.offer))
const isUpcoming = computed(() => promoPhase.value === 'upcoming')
const hasSavings = computed(() => promoPhase.value === 'active' && Number(props.offer.diff_percent) < 0)
const pctLabel = computed(() => `${Math.abs(Math.round(Number(props.offer.diff_percent || 0)))}%`)
const priceLabel = computed(() => formatOfferPrice(props.offer))
const unitPriceLabel = computed(() => formatUnitPrice({
  priceVolumeMin: props.offer.price_volume_min,
  volumeUnitMin: props.offer.volume_unit_min,
  comparisonBase: props.offer.comparison_base,
}))
const avgLabel = computed(() =>
  props.offer.avg_price != null ? BRL.format(Number(props.offer.avg_price)) : '',
)
const stripeClass = computed(() => {
  if (isExpired.value) return 'deal__stripe--expired'
  if (isUpcoming.value) return 'deal__stripe--upcoming'
  if (hasSavings.value) return 'deal__stripe--savings'
  return 'deal__stripe--brand'
})

const validityLabel = computed(() => formatPromoValidityLabel(props.offer))
</script>

<style scoped>
.deal {
  display: flex;
  width: 100%;
  align-items: stretch;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  text-align: left;
  text-decoration: none;
  color: inherit;
}

.deal:hover {
  text-decoration: none;
  border-color: rgba(255, 200, 0, 0.35);
}

.deal--expired {
  opacity: 0.82;
}

.deal__stripe {
  flex: 0 0 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.25rem;
  gap: 0.15rem;
}

.deal__stripe--savings {
  background: var(--red);
  color: var(--white);
}

.deal__stripe--brand {
  background: var(--yellow);
  color: var(--navy);
}

.deal__stripe--expired {
  background: #3a4454;
  color: rgba(255, 255, 255, 0.85);
}

.deal__stripe--upcoming {
  background: var(--upcoming);
  color: var(--white);
}

.deal__stripe-label {
  font-size: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
}

.deal__stripe-main {
  font-weight: 900;
  font-size: 1.05rem;
  line-height: 1;
}

.deal__stripe-main--word {
  font-size: 0.65rem;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  letter-spacing: 0.08em;
}

.deal__body {
  flex: 1;
  padding: 0.85rem 1rem;
  min-width: 0;
}

.deal__category {
  font-size: 0.7rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.25rem;
}

.deal__name {
  display: block;
  font-weight: 800;
  font-size: 1rem;
  color: var(--white);
  margin-bottom: 0.35rem;
}

.deal:hover .deal__name {
  color: var(--yellow);
}

.deal__meta {
  font-size: 0.8rem;
  color: var(--muted);
  margin-bottom: 0.35rem;
}

.deal__store {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--muted);
  min-width: 0;
}

.deal__store-logo {
  width: 18px;
  height: 18px;
  object-fit: contain;
  border-radius: 4px;
  background: #fff;
  flex: 0 0 auto;
}

.deal__validity {
  margin: 0 0 0.4rem;
  font-size: 0.75rem;
  color: var(--yellow);
}

.deal__validity--expired {
  color: rgba(255, 255, 255, 0.55);
}

.deal__validity--upcoming {
  color: var(--upcoming-light);
}

.deal__price {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.45rem;
}

.deal__price-stack {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.deal__price-now {
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--yellow);
}

.deal--expired .deal__price-now {
  color: rgba(255, 255, 255, 0.75);
}

.deal__price-unit {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--muted);
  line-height: 1.2;
}

.deal__club {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  background: rgba(255, 200, 0, 0.15);
  color: var(--yellow);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.deal__price-avg {
  font-size: 0.75rem;
  color: var(--muted);
  text-decoration: line-through;
}
</style>
