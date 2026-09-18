<template>
  <div class="page">
    <AppHeader />
    <main class="page__main">
      <AppBreadcrumb :items="siteTrail({ label: EGG_RADAR_TITLE })" />
      <EggRadarActionsBar />
      <div class="page__heading">
        <span class="page__icon" aria-hidden="true">{{ EGG_RADAR_EMOJI }}</span>
        <div class="page__titles">
          <h1>{{ EGG_RADAR_TITLE }}</h1>
          <p class="page__lead">{{ EGG_RADAR_DESCRIPTION }}</p>
        </div>
      </div>

      <p v-if="items.length" class="page__count" data-test="egg-radar-count">
        {{ eggRadarCountLabel(items.length) }} · do mais barato por ovo
      </p>
      <OfferCard
        v-for="offer in items"
        :key="offer.id"
        :offer="offer"
      />

      <p v-if="pending && !items.length" class="page__empty" aria-live="polite">
        Carregando ofertas de ovos…
      </p>
      <div v-else-if="error" class="page__empty">
        <p>Não foi possível carregar o radar.</p>
        <button type="button" class="page__retry" @click="refresh()">Tentar de novo</button>
      </div>
      <p v-else-if="!items.length" class="page__empty">
        Nenhuma oferta de ovos brancos, vermelhos ou de galinha hoje. Toque no sino para saber quando aparecer.
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { siteTrail } from '~/utils/breadcrumb'
import {
  EGG_RADAR_API_PATH,
  EGG_RADAR_DESCRIPTION,
  EGG_RADAR_EMOJI,
  EGG_RADAR_PAGE_LIMIT,
  EGG_RADAR_PATH,
  EGG_RADAR_TITLE,
  eggRadarCountLabel,
} from '~/utils/eggRadar'
import { jboGet, type JboOffersPage } from '~/utils/jboApi'

const { data, error, pending, refresh } = await useAsyncData(
  'jbo-egg-radar',
  () => jboGet<JboOffersPage>(EGG_RADAR_API_PATH, { limit: EGG_RADAR_PAGE_LIMIT }),
)

useSyncLoadingIndicator(pending)

useJboSeo({
  title: `${EGG_RADAR_TITLE}: ${EGG_RADAR_DESCRIPTION.toLowerCase()} em Joinville | Joinville Boas Ofertas`,
  description: 'Ofertas de ovos brancos, vermelhos e de galinha nos supermercados de Joinville, do mais barato por ovo.',
  path: EGG_RADAR_PATH,
})

/** Ofertas na ordem do snap-api (vigentes hoje, da mais barata por ovo). */
const items = computed(() => data.value?.items || [])
</script>

<style scoped>
.page__main {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.25rem 1rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.page__main :deep(.crumbs) {
  margin-bottom: 0;
}

.page__main :deep(.radar-actions) {
  margin-bottom: -0.5rem;
}

.page__heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 0.25rem;
}

.page__icon {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: var(--yellow-soft);
  font-size: 26px;
}

.page__titles {
  min-width: 0;
}

h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.page__lead {
  margin: 2px 0 0;
  color: var(--ink-2);
  font-size: 14px;
  font-weight: 600;
}

.page__count {
  margin: 0;
  color: var(--ink-3);
  font-size: 13px;
  font-weight: 600;
}

.page__empty {
  text-align: center;
  color: var(--ink-3);
  padding: 1.5rem 0.5rem;
}

.page__empty p {
  margin: 0;
}

.page__retry {
  margin-top: 0.75rem;
  border: none;
  background: var(--yellow);
  color: var(--navy);
  font: inherit;
  font-weight: 800;
  border-radius: 10px;
  padding: 0.6rem 1rem;
  cursor: pointer;
}
</style>
