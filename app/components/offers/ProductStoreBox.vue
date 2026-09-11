<template>
  <div class="store-box">
    <div class="store-box__row">
      <NuxtLink
        v-if="href"
        class="store-box__main"
        :to="href"
      >
        <img
          v-if="offer.establishment_logo_url"
          class="hero__logo"
          :src="offer.establishment_logo_url"
          :alt="`Logo ${offer.establishment_name}`"
        >
        <span
          v-else
          class="hero__logo hero__logo--fallback"
          aria-hidden="true"
        >{{ initials(offer.establishment_name) }}</span>
        <span class="store-box__name">{{ offer.establishment_name }}</span>
      </NuxtLink>
      <div v-else class="store-box__main">
        <img
          v-if="offer.establishment_logo_url"
          class="hero__logo"
          :src="offer.establishment_logo_url"
          :alt="`Logo ${offer.establishment_name}`"
        >
        <span
          v-else
          class="hero__logo hero__logo--fallback"
          aria-hidden="true"
        >{{ initials(offer.establishment_name) }}</span>
        <span class="store-box__name">{{ offer.establishment_name }}</span>
      </div>
      <StoreFollowBell
        :establishment-id="offer.establishment_id"
        :store-name="offer.establishment_name"
        show-hint
      />
    </div>
    <p v-if="primary" class="store-box__addr">{{ primary }}</p>
    <ul v-if="expanded && extras.length" class="store-box__more">
      <li v-for="addr in extras" :key="addr">{{ addr }}</li>
    </ul>
    <button
      v-if="extras.length"
      type="button"
      class="store-box__toggle"
      :aria-expanded="expanded ? 'true' : 'false'"
      @click="expanded = !expanded"
    >
      {{ expanded ? 'ocultar endereços' : 'ver outros endereços' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { JboOffer } from '~/utils/jboApi'
import { storeAddressLines } from '~/utils/productPageLists'

const props = defineProps<{ offer: JboOffer }>()

const expanded = ref(false)
const lines = computed(() => storeAddressLines(props.offer))
const primary = computed(() => lines.value[0] || '')
const extras = computed(() => lines.value.slice(1))
const href = computed(() =>
  props.offer.establishment_slug ? `/loja/${props.offer.establishment_slug}` : '',
)

/** Iniciais quando a loja ainda não tem logo. */
function initials(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
</script>

<style scoped>
.store-box {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0;
  padding: 0.85rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
}

.store-box__row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.store-box__main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
  color: var(--ink);
  font-weight: 700;
  text-decoration: none;
}

a.store-box__main:hover {
  color: var(--ink);
  text-decoration: none;
}

.store-box__name {
  min-width: 0;
}

.hero__logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  flex: 0 0 auto;
}

.hero__logo--fallback {
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 900;
  color: var(--navy, #0a1f33);
  background: var(--yellow);
}

.store-box__addr,
.store-box__more {
  margin: 0;
  padding: 0;
  color: var(--muted);
  font-size: 0.85rem;
  line-height: 1.35;
}

.store-box__more {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.store-box__toggle {
  align-self: flex-start;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--blue);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.store-box__toggle:hover,
.store-box__toggle:focus-visible {
  text-decoration: underline;
}

.store-box__toggle:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
}
</style>
