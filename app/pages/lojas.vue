<template>
  <div class="page">
    <AppHeader />
    <main class="page__main">
      <header class="page__intro">
        <h1>Lojas</h1>
        <p>Lojas ativas em Joinville e região.</p>
      </header>

      <div class="search">
        <label class="sr-only" for="est-search">Buscar loja</label>
        <input
          id="est-search"
          v-model="q"
          type="search"
          class="search__input"
          placeholder="Buscar por nome…"
          autocomplete="off"
        >
      </div>

      <p v-if="pending" class="muted">Carregando…</p>
      <p v-else-if="loadError" class="muted">Não foi possível carregar a lista.</p>
      <p v-else-if="!filtered.length" class="muted">Nenhuma loja encontrada.</p>

      <ul v-else class="list" aria-label="Lista de lojas">
        <li v-for="est in filtered" :key="est.id">
          <NuxtLink
            :to="`/loja/${est.slug}`"
            class="list__item"
          >
            <span class="list__media">
              <img
                v-if="est.logo_url"
                :src="est.logo_url"
                :alt="`Logo ${est.name}`"
                class="list__logo"
              >
              <span v-else class="list__logo list__logo--fallback" aria-hidden="true">
                {{ initials(est.name) }}
              </span>
            </span>
            <span class="list__text">
              <span class="list__name">{{ est.name }}</span>
              <span v-if="est.address" class="list__addr">{{ est.address }}</span>
            </span>
          </NuxtLink>
        </li>
      </ul>
    </main>
  </div>
</template>

<script setup lang="ts">
import { jboGet } from '~/utils/jboApi'

type EstItem = {
  id: string
  name: string
  slug: string
  address?: string
  logo_url?: string | null
}

const q = ref('')

const { data, pending, error } = await useAsyncData(
  'jbo-establishments',
  () => jboGet<{ items: EstItem[] }>('/establishments'),
)

const items = computed(() => data.value?.items || [])
const loadError = computed(() => Boolean(error.value))

/**
 * Normaliza texto para busca sem acento.
 */
function normalizeText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

/** Iniciais para fallback visual quando não há logo. */
function initials(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const filtered = computed(() => {
  const term = normalizeText(q.value).trim()
  if (!term) return items.value
  return items.value.filter(e => normalizeText(e.name).includes(term))
})

useSeoMeta({
  title: 'Lojas | Joinville Boas Ofertas',
  description: 'Lista de lojas com ofertas em Joinville e região.',
})
</script>

<style scoped>
.page__main {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.25rem 1rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.page__intro h1 {
  margin: 0 0 0.35rem;
  font-size: 1.45rem;
  font-weight: 900;
}

.page__intro p {
  margin: 0;
  color: var(--muted);
  font-size: 0.95rem;
}

.search__input {
  width: 100%;
  border: 1px solid var(--border);
  background: var(--navy-light);
  color: var(--white);
  border-radius: 10px;
  padding: 0.65rem 0.85rem;
  font: inherit;
  font-size: 0.95rem;
}

.search__input:focus {
  outline: 2px solid var(--yellow);
  outline-offset: 1px;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.list__item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  background: rgba(255, 255, 255, 0.02);
}

.list__item:hover {
  border-color: var(--yellow);
}

.list__media {
  flex: 0 0 auto;
}

.list__logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: 10px;
  background: #fff;
  border: 1px solid var(--border);
}

.list__logo--fallback {
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--navy, #0a1f33);
  background: var(--yellow);
}

.list__text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.list__name {
  font-weight: 800;
  font-size: 1rem;
}

.list__addr {
  color: var(--muted);
  font-size: 0.85rem;
}

.muted {
  color: var(--muted);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
