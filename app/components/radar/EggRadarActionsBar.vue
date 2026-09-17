<template>
  <div class="radar-actions">
    <p class="radar-actions__status" aria-live="polite">
      <template v-if="transientText">{{ transientText }}</template>
      <button
        v-else
        type="button"
        class="radar-actions__caption"
        :class="{ 'radar-actions__caption--on': caption.on }"
        :disabled="busy"
        data-test="egg-radar-follow-caption"
        @click="toggle"
      >
        {{ caption.text }}
      </button>
    </p>
    <div class="radar-actions__bar" role="group" aria-label="Ações do Radar do ovo">
      <button
        type="button"
        class="radar-actions__btn"
        aria-label="Compartilhar Radar do ovo"
        title="Compartilhar"
        data-test="egg-radar-share"
        @click="onShare"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="18" cy="5" r="2.5" fill="currentColor" />
          <circle cx="6" cy="12" r="2.5" fill="currentColor" />
          <circle cx="18" cy="19" r="2.5" fill="currentColor" />
          <path
            d="M8.4 10.8 15.6 6.7M8.4 13.2l7.2 4.1"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <button
        type="button"
        class="radar-actions__btn radar-actions__bell"
        :aria-label="bellLabel"
        :title="bellLabel"
        :aria-pressed="following ? 'true' : 'false'"
        :aria-busy="busy ? 'true' : undefined"
        data-test="egg-radar-follow"
        @click="toggle"
      >
        <svg class="radar-actions__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path class="radar-actions__bell-body" d="M12 3a6 6 0 0 0-6 6v2.7L4.2 15a1.2 1.2 0 0 0 1 1.9h13.6a1.2 1.2 0 0 0 1-1.9L18 11.7V9a6 6 0 0 0-6-6zm0 18a2.8 2.8 0 0 1-2.7-2h5.4A2.8 2.8 0 0 1 12 21z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  EGG_RADAR_DESCRIPTION,
  EGG_RADAR_PATH,
  EGG_RADAR_TITLE,
  eggRadarBellLabel,
  eggRadarCaption,
} from '~/utils/eggRadar'

const { following, busy, flash, toggle } = useJboEggRadarFollow()
const { status: shareStatus, share } = useShareLink()

/** Legenda persistente: convida a ligar ou confirma que os avisos estão ligados. */
const caption = computed(() => eggRadarCaption(following.value))
/** Rótulo acessível do botão do sino. */
const bellLabel = computed(() => eggRadarBellLabel(following.value))

/** Aviso passageiro: compartilhar tem prioridade, depois o resultado do sino. */
const transientText = computed(() => {
  if (shareStatus.value === 'copied') return 'Link copiado'
  if (shareStatus.value === 'failed') return 'Não foi possível compartilhar agora.'
  return flash.value
})

/** Folha nativa ou copiar a URL do radar. */
async function onShare() {
  const origin = import.meta.client ? window.location.origin : ''
  await share({
    title: EGG_RADAR_TITLE,
    text: `${EGG_RADAR_TITLE}: ${EGG_RADAR_DESCRIPTION.toLowerCase()} em Joinville`,
    url: `${origin}${EGG_RADAR_PATH}`,
  })
}
</script>

<style scoped>
/* Mesmo desenho da barra do produto: aviso à esquerda, botões de 44px à direita. */
.radar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  min-height: 44px;
}

.radar-actions__status {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: var(--ink-2);
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.3;
  text-align: right;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.radar-actions__caption {
  padding: 0.25rem 0;
  border: 0;
  background: none;
  color: var(--ink-2);
  font: inherit;
  text-align: right;
  cursor: pointer;
}

.radar-actions__caption--on {
  color: var(--yellow-ink);
}

.radar-actions__bar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.radar-actions__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink-2);
  cursor: pointer;
}

.radar-actions__icon {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.radar-actions__bell[aria-pressed="true"] {
  background: var(--yellow-soft);
  border-color: var(--yellow);
  color: var(--yellow-ink);
}

.radar-actions__bell[aria-pressed="true"] .radar-actions__bell-body {
  fill: currentColor;
}

.radar-actions__bell[aria-busy="true"] {
  cursor: progress;
}

.radar-actions__btn:hover {
  border-color: var(--ink-3);
}

.radar-actions__btn:focus-visible,
.radar-actions__caption:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
}
</style>
