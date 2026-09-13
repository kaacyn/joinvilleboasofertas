<template>
  <div class="hcar">
    <div ref="listRef" class="hlist" role="list">
      <div
        v-for="offer in offers"
        :key="offer.id"
        class="hlist__item"
        role="listitem"
      >
        <OfferTile :offer="offer" />
      </div>
    </div>
    <button
      v-show="canPrev"
      type="button"
      class="hcar__nav hcar__nav--prev"
      aria-label="Ofertas anteriores"
      @click="scrollByPage(-1)"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <button
      v-show="canNext"
      type="button"
      class="hcar__nav hcar__nav--next"
      aria-label="Próximas ofertas"
      @click="scrollByPage(1)"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { JboOffer } from '~/utils/jboApi'

/** Lista horizontal com scroll-snap (estilo .hlist do protótipo). */
defineProps<{ offers: JboOffer[] }>()

/** Setas só para mouse (hover + pointer fine); no toque o deslize já resolve. */
const listRef = ref<HTMLElement | null>(null)
const { canPrev, canNext, scrollByPage } = useCarouselNav(listRef)
</script>

<style scoped>
.hcar {
  position: relative;
}

.hcar__nav {
  display: none;
  position: absolute;
  top: 50%;
  z-index: 1;
  width: 36px;
  height: 36px;
  padding: 0;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  transform: translateY(-50%);
  cursor: pointer;
}

.hcar__nav:hover {
  border-color: var(--ink-3);
}

.hcar__nav--prev {
  left: 8px;
}

.hcar__nav--next {
  right: 8px;
}

@media (hover: hover) and (pointer: fine) {
  .hcar__nav {
    display: grid;
  }
}

.hlist {
  display: flex;
  gap: 12px;
  padding: 0 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  /* Snap alinhado ao padding: em repouso o scroll fica em 0 e o 1º tile mantém a margem. */
  scroll-padding-inline: 16px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.hlist::-webkit-scrollbar {
  display: none;
}

.hlist__item {
  flex: none;
  scroll-snap-align: start;
}
</style>
