<template>
  <article
    class="card"
    :class="{
      'card--expired': isExpired,
      'card--upcoming': isUpcoming,
    }"
  >
    <span class="card__media">
      <img
        v-if="encarte.image_url"
        class="card__fill"
        :src="encarte.image_url"
        alt=""
        aria-hidden="true"
      >
      <img
        v-if="encarte.image_url"
        class="card__img"
        :src="encarte.image_url"
        :alt="`Encarte ${encarte.establishment_name}`"
        loading="lazy"
      >
      <span v-else class="card__placeholder">Imagem indisponível</span>
      <EncarteRefBadge :scan-id="encarte.id" />
      <button
        type="button"
        class="card__open card__open--media"
        aria-label="Abrir encarte"
        @click="$emit('open', encarte)"
      ></button>
      <button
        type="button"
        class="card__bell"
        aria-label="Receber avisos desta loja"
        :aria-pressed="isFollowing(encarte.establishment_id) ? 'true' : 'false'"
        @click.stop="onBell"
      >
        <svg class="card__bell-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M12 3a6 6 0 0 0-6 6v2.7L4.2 15a1.2 1.2 0 0 0 1 1.9h13.6a1.2 1.2 0 0 0 1-1.9L18 11.7V9a6 6 0 0 0-6-6zm0 18a2.8 2.8 0 0 1-2.7-2h5.4A2.8 2.8 0 0 1 12 21z" />
        </svg>
      </button>
      <p
        v-if="followHint && hintFor === encarte.establishment_id"
        class="card__bell-hint"
        aria-live="polite"
      >{{ followHint }}</p>
      <button
        type="button"
        class="card__share"
        aria-label="Compartilhar encarte"
        @click="onShare"
      >
        ⋯
      </button>
    </span>
    <button
      type="button"
      class="card__open"
      @click="$emit('open', encarte)"
    >
      <span class="card__meta">
        <span class="card__store">
          <img
            v-if="encarte.establishment_logo_url"
            class="card__logo"
            :src="encarte.establishment_logo_url"
            :alt="`Logo ${encarte.establishment_name}`"
            loading="lazy"
          >
          <span v-else class="card__logo card__logo--fallback" aria-hidden="true">
            {{ initials(encarte.establishment_name) }}
          </span>
          <span class="card__store-name">{{ encarte.establishment_name }}</span>
        </span>
        <span
          class="card__dates"
          :class="{
            'card__dates--expired': isExpired,
            'card__dates--upcoming': isUpcoming,
            'card__dates--hot': endingToday,
          }"
        >
          {{ validityLabel }}
        </span>
        <span class="card__registered">
          {{ formatRegisteredAt(encarte.created_at, new Date(renderedAt)) }}
        </span>
        <span v-if="isExpired" class="card__badge card__badge--expired">Expirado</span>
        <span v-else-if="isUpcoming" class="card__badge card__badge--upcoming">Em breve</span>
        <span v-else-if="endingToday" class="card__badge card__badge--hot">Termina hoje</span>
        <span class="card__copied" aria-live="polite">{{ copied ? 'Link copiado' : '' }}</span>
      </span>
    </button>
  </article>
</template>

<script setup lang="ts">
import type { JboEncarte } from '~/utils/jboApi'
import {
  formatPromoValidityLabel,
  getPromoPhase,
  isEndingToday,
  isPromoExpired,
} from '~/utils/promoPhase'
import { formatRegisteredAt } from '~/utils/relativeTime'
import { shareEncarte } from '~/utils/shareEncarte'

const props = defineProps<{ encarte: JboEncarte }>()
defineEmits<{ open: [encarte: JboEncarte] }>()

const { isFollowing, requestToggle, hint: followHint, hintFor } = useJboStoreFollow()

const promoPhase = computed(() => getPromoPhase(props.encarte))
const isExpired = computed(() => isPromoExpired(props.encarte))
const isUpcoming = computed(() => promoPhase.value === 'upcoming')
const endingToday = computed(() => isEndingToday(props.encarte))
const validityLabel = computed(() => formatPromoValidityLabel(props.encarte))

/** Liga ou desliga avisos da loja sem abrir o lightbox. */
async function onBell() {
  await requestToggle(props.encarte.establishment_id, props.encarte.establishment_name)
}

/** Instante serializado no payload: SSR e hidratação usam a mesma referência de tempo. */
const renderedAt = useState('encartes:rendered-at', () => new Date().toISOString())

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

/** Folha nativa ou copiar link `{origin}/encarte/{id}`. */
async function onShare() {
  const origin = import.meta.client ? window.location.origin : ''
  const result = await shareEncarte({
    title: props.encarte.establishment_name,
    text: 'Encarte',
    url: `${origin}/encarte/${props.encarte.id}`,
  }).catch(() => undefined)
  if (result !== 'copied') return
  copied.value = true
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copied.value = false
  }, 2000)
}

/** Iniciais para reserva visual quando a loja não tem logo. */
function initials(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
</script>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink);
}

.card:hover,
.card:focus-within {
  border-color: var(--ink-3);
}

.card--expired {
  opacity: 0.82;
}

.card__media {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 9 / 16;
  overflow: hidden;
  background: #EEF0F3;
}

.card__fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(18px) saturate(1.15);
  transform: scale(1.12);
  pointer-events: none;
}

.card__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}

.card__placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 1rem;
  color: var(--ink-3);
  font-size: 0.8rem;
  text-align: center;
}

.card__bell,
.card__share {
  position: absolute;
  top: 0.4rem;
  z-index: 2;
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
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.card__bell[aria-pressed="true"] {
  background: var(--yellow-soft);
  border-color: var(--yellow);
  color: var(--yellow-ink);
}

.card__bell {
  left: 0.4rem;
}

.card__share {
  right: 0.4rem;
}

.card__bell-icon {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linejoin: round;
}

.card__bell[aria-pressed="true"] .card__bell-icon {
  fill: currentColor;
}

.card__bell-hint {
  position: absolute;
  top: calc(0.4rem + 48px);
  left: 0.4rem;
  z-index: 2;
  max-width: calc(100% - 0.8rem);
  margin: 0;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font-size: 0.72rem;
  line-height: 1.3;
}

.card__bell:hover,
.card__share:hover {
  border-color: var(--ink-3);
}

.card__bell:focus-visible,
.card__share:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
}

.card__open {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.card__open--media {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: auto;
  height: auto;
}

.card__open:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: -2px;
}

.card__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  padding: 0.8rem 0.9rem 0.9rem;
}

.card__store {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  font-size: 0.95rem;
  font-weight: 800;
}

.card__logo {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  border-radius: 4px;
  object-fit: contain;
  background: var(--surface);
}

.card__logo--fallback {
  display: grid;
  place-items: center;
  background: var(--navy);
  color: var(--on-dark);
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.card__store-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__dates,
.card__registered,
.card__copied {
  color: var(--ink-3);
  font-size: 0.78rem;
}

.card__dates--expired {
  color: var(--ink-3);
}

.card__dates--upcoming {
  color: var(--blue);
}

.card__dates--hot {
  color: var(--red);
  font-weight: 600;
}

.card__copied:empty {
  display: none;
}

.card__badge {
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.card__badge--expired {
  background: #EEF0F3;
  color: var(--ink-2);
}

.card__badge--upcoming {
  background: var(--blue-soft);
  color: var(--blue);
}

.card__badge--hot {
  background: var(--red-soft);
  color: var(--red);
}
</style>
