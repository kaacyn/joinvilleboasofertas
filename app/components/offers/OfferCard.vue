<template>
  <NuxtLink
    class="deal"
    :class="{ 'deal--expired': isExpired }"
    :to="productHref"
  >
    <div class="deal__media" :style="mediaStyle">
      <img
        v-if="offer.image_url"
        class="deal__img"
        :src="offer.image_url"
        :alt="title"
        loading="lazy"
      >
      <span v-else class="deal__emoji" aria-hidden="true">{{ icon.emoji }}</span>
      <span v-if="badge" class="deal__badge" :class="badgeClass">{{ badge.label }}</span>
    </div>

    <div class="deal__body">
      <div v-if="offer.category_name" class="deal__category">
        {{ offer.category_name }}
      </div>
      <div class="deal__name">
        {{ title }}
      </div>
      <div class="deal__price">
        <span class="deal__price-now">
          <span v-if="priceParts.prefix" class="deal__price-prefix">{{ priceParts.prefix }} </span>{{ priceParts.amount }}<span
            v-if="priceParts.suffix"
            class="deal__price-vol"
          >{{ priceParts.suffix }}</span>
        </span>
        <s
          v-if="priceParts.regular"
          class="deal__price-regular"
          :title="`${priceParts.regular} sem o ${clubLabel}`"
        >{{ priceParts.regular }}</s>
        <s
          v-else-if="hasSavings && avgLabel"
          class="deal__price-avg"
          :title="`Média nos mercados: ${avgLabel}`"
        >{{ avgLabel }}</s>
      </div>
      <div v-if="priceParts.each || unitPriceLabel" class="deal__secondary">
        <span v-if="priceParts.each" class="deal__price-each">{{ priceParts.each }}</span>
        <span v-if="unitPriceLabel" class="deal__price-unit">{{ unitPriceLabel }}</span>
      </div>
      <div v-if="!hideStore" class="deal__store">
        <img
          v-if="offer.establishment_logo_url"
          class="deal__store-logo"
          :src="offer.establishment_logo_url"
          :alt="`Logo ${offer.establishment_name}`"
          loading="lazy"
        >
        <span>{{ offer.establishment_name }}</span>
      </div>
      <p
        v-if="validityLabel"
        class="deal__validity"
        :class="{
          'deal__validity--hot': endingToday,
          'deal__validity--expired': isExpired,
          'deal__validity--upcoming': isUpcoming,
        }"
      >
        {{ validityLabel }}
      </p>
      <ul v-if="chips.length" class="deal__chips" aria-label="Condições da oferta">
        <li
          v-for="chip in chips"
          :key="chip.key"
          class="deal__chip"
          :class="`deal__chip--${chip.key}`"
          :title="chip.title"
        >
          {{ chip.label }}
        </li>
      </ul>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { categoryIcon } from '~/utils/categoryIcons'
import { clubBadgeLabel, productOfferPath, type JboOffer } from '~/utils/jboApi'
import { offerBadge } from '~/utils/offerBadge'
import {
  formatMoney,
  formatOfferPriceParts,
  formatUnitPrice,
  offerChips,
} from '~/utils/offerPrice'
import { offerTitle } from '~/utils/offerTitle'
import {
  formatPromoValidityLabel,
  getPromoPhase,
  isEndingToday,
  isPromoExpired,
} from '~/utils/promoPhase'

const props = withDefaults(defineProps<{
  offer: JboOffer
  /** Esconde logo/nome da loja (ex.: já no título da seção). */
  hideStore?: boolean
}>(), {
  hideStore: false,
})

const clubLabel = computed(() => clubBadgeLabel(props.offer))
const productHref = computed(() => productOfferPath(props.offer))
const promoPhase = computed(() => getPromoPhase(props.offer))
const isExpired = computed(() => isPromoExpired(props.offer))
const isUpcoming = computed(() => promoPhase.value === 'upcoming')
const endingToday = computed(() => isEndingToday(props.offer))
const hasSavings = computed(() => promoPhase.value === 'active' && Number(props.offer.diff_percent) < 0)
/** Título completo: nome + marca + volume. */
const title = computed(() => offerTitle(props.offer))
const priceParts = computed(() => formatOfferPriceParts(props.offer))
const unitPriceLabel = computed(() => formatUnitPrice(props.offer))
const chips = computed(() => offerChips(props.offer))
const avgLabel = computed(() => formatMoney(props.offer.avg_price))
const validityLabel = computed(() => formatPromoValidityLabel(props.offer))
const badge = computed(() => offerBadge(props.offer))
/** Badge amarelo quando o preço principal é de clube; senão a cor da fase/economia. */
const badgeClass = computed(() => badge.value
  ? (badge.value.club ? 'deal__badge--club' : `deal__badge--${badge.value.kind}`)
  : '')
const icon = computed(() => categoryIcon(props.offer.category_slug))
/** Fundo neutro com imagem; fundo suave da categoria no fallback de emoji. */
const mediaStyle = computed(() => ({ background: props.offer.image_url ? '#F7F8FA' : icon.value.bg }))
</script>

<style scoped>
.deal {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  color: inherit;
  text-align: left;
  text-decoration: none;
}

.deal:hover {
  text-decoration: none;
  border-color: var(--ink-3);
}

.deal--expired {
  opacity: 0.82;
}

.deal__media {
  position: relative;
  flex: none;
  width: 92px;
  height: 92px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 12px;
}

.deal__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.deal__emoji {
  font-size: 36px;
  line-height: 1;
}

.deal__badge {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 3px 6px;
  border-radius: 8px;
  font-family: var(--head);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.deal__badge--savings {
  background: var(--red);
  color: var(--on-dark);
}

.deal__badge--club {
  background: var(--yellow);
  color: var(--navy);
}

.deal__badge--upcoming {
  background: var(--blue);
  color: var(--on-dark);
}

.deal__badge--expired {
  background: #EEF0F3;
  color: var(--ink-2);
}

.deal__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.deal__category {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.deal__name {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--ink);
}

.deal__price {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.deal__price-now {
  font-family: var(--head);
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.deal__price-prefix,
.deal__price-vol {
  font-family: var(--body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--ink-3);
}

.deal__price-regular,
.deal__price-avg {
  font-size: 12px;
  color: var(--ink-3);
  text-decoration: line-through;
}

.deal__secondary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.deal__price-each,
.deal__price-unit {
  font-size: 12px;
  color: var(--ink-3);
}

.deal__store {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  font-size: 12px;
  color: var(--ink-2);
  min-width: 0;
}

.deal__store-logo {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  border-radius: 6px;
  object-fit: contain;
  background: var(--surface);
  border: 1px solid var(--line);
}

.deal__validity {
  margin: 0;
  font-size: 11px;
  color: var(--ink-3);
}

.deal__validity--hot {
  color: var(--red);
  font-weight: 600;
}

.deal__validity--expired {
  color: var(--ink-3);
}

.deal__validity--upcoming {
  color: var(--blue);
}

.deal__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 3px 0 0;
  padding: 0;
  list-style: none;
}

.deal__chip {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  background: #EEF0F3;
  color: var(--ink-2);
}

.deal__chip--promotion {
  background: var(--yellow-soft);
  color: var(--yellow-ink);
}
</style>
