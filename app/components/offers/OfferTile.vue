<template>
  <NuxtLink class="tile" :class="{ 'tile--expired': isExpired }" :to="productHref">
    <div class="tile__media" :style="mediaStyle">
      <img
        v-if="offer.image_url"
        class="tile__img"
        :src="offer.image_url"
        :alt="title"
        loading="lazy"
      >
      <span v-else class="tile__emoji" aria-hidden="true">{{ icon.emoji }}</span>
      <span v-if="badge" class="tile__badge" :class="badgeClass">{{ badge.label }}</span>
    </div>
    <div class="tile__body">
      <div class="tile__name">{{ title }}</div>
      <div class="tile__price">
        <span class="tile__price-now">
          <span v-if="priceParts.prefix" class="tile__price-small">{{ priceParts.prefix }} </span>{{ priceParts.amount }}<span
            v-if="priceParts.suffix"
            class="tile__price-small"
          >{{ priceParts.suffix }}</span>
        </span>
        <s v-if="strike" class="tile__was">{{ strike }}</s>
      </div>
      <div v-if="secondary" class="tile__secondary">{{ secondary }}</div>
      <div class="tile__store">
        <img
          v-if="offer.establishment_logo_url"
          class="tile__store-logo"
          :src="offer.establishment_logo_url"
          :alt="`Logo ${offer.establishment_name}`"
          loading="lazy"
        >
        <span class="tile__store-name">{{ offer.establishment_name }}</span>
      </div>
      <div v-if="validityLabel" class="tile__valid" :class="{ 'tile__valid--hot': endingToday }">
        {{ validityLabel }}
      </div>
      <span v-if="promotion" class="tile__chip">{{ promotion }}</span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { categoryIcon } from '~/utils/categoryIcons'
import { productOfferPath, type JboOffer } from '~/utils/jboApi'
import { offerBadge } from '~/utils/offerBadge'
import { offerTitle } from '~/utils/offerTitle'
import { formatMoney, formatOfferPriceParts, formatUnitPrice, offerChips } from '~/utils/offerPrice'
import { formatPromoValidityLabel, getPromoPhase, isEndingToday, isPromoExpired } from '~/utils/promoPhase'
import { formatPromoEndLabel } from '~/utils/relativeTime'

const props = defineProps<{ offer: JboOffer }>()

const productHref = computed(() => productOfferPath(props.offer))
/** Título completo: nome + marca + volume. */
const title = computed(() => offerTitle(props.offer))
const phase = computed(() => getPromoPhase(props.offer))
const isExpired = computed(() => isPromoExpired(props.offer))
const endingToday = computed(() => isEndingToday(props.offer))
const hasSavings = computed(() => phase.value === 'active' && Number(props.offer.diff_percent) < 0)
const priceParts = computed(() => formatOfferPriceParts(props.offer))
const badge = computed(() => offerBadge(props.offer))
const badgeClass = computed(() => badge.value
  ? (badge.value.club ? 'tile__badge--club' : `tile__badge--${badge.value.kind}`)
  : '')
const icon = computed(() => categoryIcon(props.offer.category_slug))
const mediaStyle = computed(() => ({ background: props.offer.image_url ? '#F7F8FA' : icon.value.bg }))

/** Riscado: regular quando há clube; senão a média quando há economia. */
const strike = computed(() => priceParts.value.regular
  || (hasSavings.value ? formatMoney(props.offer.avg_price) : ''))

/** Linha secundária: "R$ 5,00 cada" no lote, senão preço por base de comparação. */
const secondary = computed(() => priceParts.value.each || formatUnitPrice(props.offer) || '')

/** "Termina hoje" em destaque; vigente "Até {rótulo curto}"; demais fases usam o texto completo. */
const validityLabel = computed(() => {
  if (!props.offer.promo_ends_on) return ''
  if (endingToday.value) return 'Termina hoje'
  if (phase.value === 'active') return `Até ${formatPromoEndLabel(props.offer.promo_ends_on)}`
  return formatPromoValidityLabel(props.offer)
})

const promotion = computed(() => offerChips(props.offer).find(chip => chip.key === 'promotion')?.label || '')
</script>

<style scoped>
.tile {
  display: flex;
  flex-direction: column;
  width: 156px;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  color: inherit;
  text-decoration: none;
  transition: transform 0.1s;
}

.tile:hover {
  text-decoration: none;
  border-color: var(--ink-3);
}

.tile:active {
  transform: scale(0.98);
}

.tile--expired {
  opacity: 0.82;
}

.tile__media {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 1 / 1;
  width: 100%;
  overflow: hidden;
}

.tile__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.tile__emoji {
  font-size: 44px;
  line-height: 1;
}

.tile__badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 7px;
  border-radius: 8px;
  font-family: var(--head);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.tile__badge--savings {
  background: var(--red);
  color: var(--on-dark);
}

.tile__badge--club {
  background: var(--yellow);
  color: var(--navy);
}

.tile__badge--upcoming {
  background: var(--blue);
  color: var(--on-dark);
}

.tile__badge--expired {
  background: #EEF0F3;
  color: var(--ink-2);
}

.tile__body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px 12px;
}

.tile__name {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--ink);
}

.tile__price {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.tile__price-now {
  font-family: var(--head);
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.tile__price-small {
  font-family: var(--body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--ink-3);
}

.tile__was {
  font-size: 12px;
  color: var(--ink-3);
  text-decoration: line-through;
}

.tile__secondary {
  font-size: 12px;
  color: var(--ink-3);
}

.tile__store {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--ink-2);
  min-width: 0;
}

.tile__store-logo {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  border-radius: 6px;
  object-fit: contain;
  background: var(--surface);
  border: 1px solid var(--line);
}

.tile__store-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tile__valid {
  font-size: 11px;
  color: var(--ink-3);
}

.tile__valid--hot {
  color: var(--red);
  font-weight: 600;
}

.tile__chip {
  align-self: flex-start;
  margin-top: 2px;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--yellow-soft);
  color: var(--yellow-ink);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
}
</style>
