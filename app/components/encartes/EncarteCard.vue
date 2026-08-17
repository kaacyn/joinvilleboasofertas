<template>
  <article
    class="card"
    :class="{ 'card--expired': !encarte.promo_active }"
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
      <button
        type="button"
        class="card__open card__open--media"
        aria-label="Abrir encarte"
        @click="$emit('open', encarte)"
      ></button>
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
        <span class="card__dates">
          Válido até {{ formatDate(encarte.promo_ends_on) }}
        </span>
        <span class="card__registered">
          {{ formatRegisteredAt(encarte.created_at, new Date(renderedAt)) }}
        </span>
        <span v-if="!encarte.promo_active" class="card__expired">Expirado</span>
        <span class="card__copied" aria-live="polite">{{ copied ? 'Link copiado' : '' }}</span>
      </span>
    </button>
  </article>
</template>

<script setup lang="ts">
import type { JboEncarte } from '~/utils/jboApi'
import { formatRegisteredAt } from '~/utils/relativeTime'
import { shareEncarte } from '~/utils/shareEncarte'

const props = defineProps<{ encarte: JboEncarte }>()
defineEmits<{ open: [encarte: JboEncarte] }>()

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

/** Formata uma data ISO curta sem conversão de fuso horário. */
function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso
}
</script>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: var(--white);
}

.card:hover,
.card:focus-within {
  border-color: var(--yellow);
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
  background: #0a1018;
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
  color: #8a96a8;
  font-size: 0.8rem;
  text-align: center;
}

.card__share {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--navy-light);
  color: var(--yellow);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.card__share:hover {
  border-color: var(--yellow);
}

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
  background: #fff;
}

.card__logo--fallback {
  display: grid;
  place-items: center;
  background: #2b3546;
  color: rgba(255, 255, 255, 0.85);
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
  color: var(--muted);
  font-size: 0.78rem;
}

.card__copied:empty {
  display: none;
}

.card__expired {
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  background: #3a4454;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
