<template>
  <button
    type="button"
    class="card"
    :class="{ 'card--expired': !encarte.promo_active }"
    @click="$emit('open', encarte)"
  >
    <span class="card__media">
      <img
        v-if="encarte.image_url"
        class="card__img"
        :src="encarte.image_url"
        :alt="`Encarte ${encarte.establishment_name}`"
        loading="lazy"
      >
      <span v-else class="card__placeholder">Imagem indisponível</span>
    </span>
    <span class="card__meta">
      <span class="card__store">{{ encarte.establishment_name }}</span>
      <span class="card__dates">
        Válido até {{ formatDate(encarte.promo_ends_on) }}
      </span>
      <span v-if="!encarte.promo_active" class="card__expired">Expirado</span>
    </span>
  </button>
</template>

<script setup lang="ts">
import type { JboEncarte } from '~/utils/jboApi'

defineProps<{ encarte: JboEncarte }>()
defineEmits<{ open: [encarte: JboEncarte] }>()

/** Formata uma data ISO curta sem conversão de fuso horário. */
function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso
}
</script>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: var(--white);
  text-align: left;
  cursor: pointer;
}

.card:hover,
.card:focus-visible {
  border-color: var(--yellow);
}

.card:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
}

.card--expired {
  opacity: 0.82;
}

.card__media {
  display: grid;
  width: 100%;
  aspect-ratio: 3 / 4;
  place-items: center;
  overflow: hidden;
  background: #fff;
}

.card__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.card__placeholder {
  padding: 1rem;
  color: #536070;
  font-size: 0.8rem;
  text-align: center;
}

.card__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  padding: 0.8rem 0.9rem 0.9rem;
}

.card__store {
  font-size: 0.95rem;
  font-weight: 800;
}

.card__dates {
  color: var(--muted);
  font-size: 0.78rem;
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
