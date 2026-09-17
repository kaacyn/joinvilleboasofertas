<template>
  <NuxtLink class="hero" :to="productHref" data-test="home-hero">
    <div class="hero__text">
      <div class="hero__eyebrow">Maior economia do dia</div>
      <h2 class="hero__title">
        <span class="hero__name">{{ title }}</span>
        <span class="hero__price">
          <span v-if="priceParts.prefix" class="hero__price-small">{{ priceParts.prefix }} </span>{{ priceParts.amount }}<span
            v-if="priceParts.suffix"
            class="hero__price-small"
          >{{ priceParts.suffix }}</span>
        </span>
      </h2>
      <p class="hero__meta">{{ meta }}</p>
      <span class="hero__cta">Ver oferta →</span>
    </div>
    <img
      v-if="offer.image_url"
      class="hero__img"
      :src="offer.image_url"
      :alt="title"
      loading="lazy"
    >
  </NuxtLink>
</template>

<script setup lang="ts">
import { productOfferPath, type JboOffer } from '~/utils/jboApi'
import { savingsPercent } from '~/utils/offerBadge'
import { formatOfferPriceParts } from '~/utils/offerPrice'
import { offerTitle } from '~/utils/offerTitle'
import { isEndingToday } from '~/utils/promoPhase'
import { formatPromoEndLabel } from '~/utils/relativeTime'

const props = defineProps<{ offer: JboOffer }>()

const productHref = computed(() => productOfferPath(props.offer))
/** Título completo: nome + marca + volume. */
const title = computed(() => offerTitle(props.offer))
const priceParts = computed(() => formatOfferPriceParts(props.offer))

/** "{pct}% abaixo da média · {loja} · termina hoje | até {rótulo}". */
const meta = computed(() => {
  const parts = [`${savingsPercent(props.offer)}% abaixo da média`, props.offer.establishment_name]
  if (props.offer.promo_ends_on) {
    parts.push(isEndingToday(props.offer) ? 'termina hoje' : `até ${formatPromoEndLabel(props.offer.promo_ends_on)}`)
  }
  return parts.join(' · ')
})
</script>

<style scoped>
.hero {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  overflow: hidden;
  padding: 18px 18px 16px;
  border-radius: 20px;
  background: var(--navy);
  color: var(--on-dark);
  text-decoration: none;
}

.hero::before {
  content: "";
  position: absolute;
  right: -40px;
  top: -40px;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 200, 0, 0.35), transparent 70%);
  pointer-events: none;
}

.hero:hover {
  text-decoration: none;
}

.hero__text {
  position: relative;
  flex: 1;
  min-width: 0;
}

.hero__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--yellow);
}

.hero__title {
  display: flex;
  flex-direction: column;
  margin: 6px 0 4px;
  font-family: var(--head);
  font-size: 24px;
  font-weight: 900;
  line-height: 1.1;
  color: var(--on-dark);
}

.hero__price-small {
  font-family: var(--body);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0;
  color: rgba(255, 255, 255, 0.7);
}

.hero__meta {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.hero__cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--yellow);
  color: var(--navy);
  font-size: 13px;
  font-weight: 800;
}

.hero__img {
  position: relative;
  flex: none;
  width: 72px;
  height: 72px;
  border-radius: 12px;
  object-fit: contain;
  background: #F7F8FA;
}
</style>
