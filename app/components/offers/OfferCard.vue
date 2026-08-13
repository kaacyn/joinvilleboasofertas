<template>
  <article class="deal" :class="{ 'deal--expired': isExpired }">
    <div
      class="deal__stripe"
      :class="stripeClass"
    >
      <template v-if="isExpired">
        <span class="deal__stripe-main deal__stripe-main--word">EXPIRADO</span>
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
      <NuxtLink
        class="deal__name"
        :to="`/produto/${offer.product_slug || offer.product_id}`"
      >
        {{ offer.product_name }}
      </NuxtLink>
      <div class="deal__meta">
        <NuxtLink
          v-if="offer.establishment_slug"
          :to="`/mercado/${offer.establishment_slug}`"
        >
          {{ offer.establishment_name }}
        </NuxtLink>
        <span v-else>{{ offer.establishment_name }}</span>
      </div>
      <p
        v-if="validityLabel"
        class="deal__validity"
        :class="{ 'deal__validity--expired': isExpired }"
      >
        {{ validityLabel }}
      </p>
      <div class="deal__price">
        <NuxtLink class="deal__price-now" :to="`/oferta/${offer.id}`">
          {{ priceLabel }}
        </NuxtLink>
        <span v-if="offer.is_club_price" class="deal__club">Clube</span>
        <span v-if="hasSavings && avgLabel" class="deal__price-avg">
          média {{ avgLabel }}
        </span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { JboOffer } from '~/utils/jboApi'

const props = defineProps<{ offer: JboOffer }>()

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const isExpired = computed(() => props.offer.promo_active === false)
const hasSavings = computed(() => !isExpired.value && Number(props.offer.diff_percent) < 0)
const pctLabel = computed(() => `${Math.abs(Math.round(Number(props.offer.diff_percent || 0)))}%`)
const priceLabel = computed(() => BRL.format(Number(props.offer.price)))
const avgLabel = computed(() =>
  props.offer.avg_price != null ? BRL.format(Number(props.offer.avg_price)) : '',
)
const stripeClass = computed(() => {
  if (isExpired.value) return 'deal__stripe--expired'
  if (hasSavings.value) return 'deal__stripe--savings'
  return 'deal__stripe--brand'
})

/**
 * Monta texto curto de validade / expiração da promo.
 */
function formatValidity(offer: JboOffer): string {
  if (!offer.promo_ends_on) return ''
  if (offer.promo_active === false) {
    return `Expirou em ${offer.promo_ends_on}`
  }
  return `Válido até ${offer.promo_ends_on}`
}

const validityLabel = computed(() => formatValidity(props.offer))
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
  text-decoration: none;
  margin-bottom: 0.35rem;
}

.deal__name:hover {
  color: var(--yellow);
}

.deal__meta {
  font-size: 0.8rem;
  color: var(--muted);
  margin-bottom: 0.35rem;
}

.deal__meta a {
  color: var(--muted);
}

.deal__validity {
  margin: 0 0 0.4rem;
  font-size: 0.75rem;
  color: var(--yellow);
}

.deal__validity--expired {
  color: rgba(255, 255, 255, 0.55);
}

.deal__price {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.45rem;
}

.deal__price-now {
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--yellow);
  text-decoration: none;
}

.deal--expired .deal__price-now {
  color: rgba(255, 255, 255, 0.75);
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
