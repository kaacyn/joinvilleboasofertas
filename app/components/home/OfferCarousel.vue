<template>
  <div class="hcar">
    <button
      type="button"
      class="hcar__nav hcar__nav--prev"
      :disabled="!canPrev"
      aria-label="Ofertas anteriores"
      @click="scrollByPage(-1)"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
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
      type="button"
      class="hcar__nav hcar__nav--next"
      :disabled="!canNext"
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

/**
 * Setas ladeando a lista, só para mouse (hover + pointer fine): sempre visíveis,
 * vivas quando há para onde rolar e apagadas (disabled) nas pontas.
 * No toque o deslize já resolve e as setas somem.
 */
const listRef = ref<HTMLElement | null>(null)
const { canPrev, canNext, scrollByPage } = useCarouselNav(listRef)
</script>

<style scoped>
.hcar {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
}

.hcar__nav {
  display: none;
  width: 36px;
  height: 36px;
  padding: 0;
  place-items: center;
  border: 1px solid var(--navy);
  border-radius: 999px;
  background: var(--navy);
  color: var(--on-dark);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.hcar__nav:hover:not(:disabled) {
  background: var(--yellow);
  border-color: var(--yellow);
  color: var(--navy);
}

.hcar__nav:disabled {
  background: var(--surface);
  border-color: var(--line);
  color: var(--ink-3);
  cursor: default;
}

.hlist {
  /* Mesma medida no padding e no scroll-padding: em repouso scrollLeft=0 e o 1º tile mantém a margem. */
  --pad: 16px;
  display: flex;
  gap: 12px;
  padding: 0 var(--pad);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: var(--pad);
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

@media (hover: hover) and (pointer: fine) {
  .hcar {
    grid-template-columns: auto minmax(0, 1fr) auto;
    column-gap: 4px;
    padding: 0 16px;
  }

  .hcar__nav {
    display: grid;
  }

  .hlist {
    --pad: 8px;
  }
}
</style>
