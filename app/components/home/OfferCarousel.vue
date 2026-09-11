<template>
  <div class="hlist" role="list">
    <div
      v-for="offer in offers"
      :key="offer.id"
      class="hlist__item"
      role="listitem"
    >
      <OfferTile :offer="offer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { JboOffer } from '~/utils/jboApi'

/** Lista horizontal com scroll-snap (estilo .hlist do protótipo). */
defineProps<{ offers: JboOffer[] }>()
</script>

<style scoped>
.hlist {
  display: flex;
  gap: 12px;
  padding: 0 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
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
