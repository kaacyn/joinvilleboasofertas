<template>
  <div class="hero-car">
    <div ref="trackRef" class="hero-car__track">
      <div
        v-for="offer in offers"
        :key="offer.id"
        class="hero-car__slide"
      >
        <HeroSavings :offer="offer" />
      </div>
    </div>
    <div v-if="offers.length > 1" class="hero-car__dots">
      <button
        v-for="(offer, index) in offers"
        :key="offer.id"
        type="button"
        class="hero-car__dot"
        :class="{ 'hero-car__dot--on': index === activeIndex }"
        :aria-label="`Ver oferta ${index + 1} de ${offers.length}`"
        :aria-current="index === activeIndex"
        @click="scrollToIndex(index)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { JboOffer } from '~/utils/jboApi'

/** Carrossel do topo: um card de maior economia por slide, bolinhas embaixo. */
defineProps<{ offers: JboOffer[] }>()

/**
 * Deslize nativo com scroll-snap (mesma técnica do OfferCarousel). Aqui o slide
 * ocupa a largura toda, então no lugar das setas quem navega são as bolinhas:
 * elas acendem no slide mais próximo e levam até ele no clique.
 */
const trackRef = ref<HTMLElement | null>(null)
const { activeIndex, scrollToIndex } = useCarouselNav(trackRef)
</script>

<style scoped>
.hero-car__track {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.hero-car__track::-webkit-scrollbar {
  display: none;
}

.hero-car__slide {
  display: flex;
  flex: 0 0 100%;
  scroll-snap-align: start;
}

/* Todos os slides com a mesma altura: o trilho não pula ao trocar de oferta. */
.hero-car__slide > :deep(.hero) {
  flex: 1;
}

.hero-car__dots {
  display: flex;
  gap: 2px;
  justify-content: center;
  margin-top: 6px;
}

/* Bolinha de 8px com alvo de toque de 16x28 no padding do botão. */
.hero-car__dot {
  padding: 10px 4px;
  border: none;
  background: none;
  line-height: 0;
  cursor: pointer;
}

.hero-car__dot::before {
  content: "";
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--line);
  transition: width 0.15s, background 0.15s;
}

.hero-car__dot--on::before {
  width: 20px;
  background: var(--navy);
}
</style>
