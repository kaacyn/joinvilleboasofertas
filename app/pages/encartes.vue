<template>
  <div class="page">
    <AppHeader />
    <main class="page__main">
      <header class="page__intro">
        <h1>Encartes</h1>
        <p>Encartes das lojas de Joinville e região.</p>
      </header>

      <div class="filter">
        <label class="filter__label">
          <span class="sr-only">Filtrar por loja</span>
          <select
            v-model="establishmentId"
            class="filter__select"
            :aria-describedby="storesLoadError ? 'encartes-stores-error' : undefined"
          >
            <option value="">Todas as lojas</option>
            <option v-for="store in stores" :key="store.id" :value="store.id">
              {{ store.name }}
            </option>
          </select>
        </label>
        <p
          v-if="storesLoadError"
          id="encartes-stores-error"
          class="filter__error"
          role="status"
        >
          Não foi possível carregar as lojas. Mostrando encartes de todas elas.
        </p>
      </div>

      <p v-if="pending && !items.length" class="muted" aria-live="polite">
        Carregando…
      </p>
      <p v-else-if="loadError" class="muted" role="alert">
        Não foi possível carregar os encartes.
      </p>
      <p v-else-if="!items.length" class="muted">
        Nenhum encarte encontrado.
      </p>

      <div v-if="items.length" class="grid">
        <EncarteCard
          v-for="encarte in items"
          :key="encarte.id"
          :encarte="encarte"
          @open="open = $event"
        />
      </div>

      <p v-if="loadMoreError" class="more-error" role="alert">
        Não foi possível carregar mais encartes. Tente novamente.
      </p>
      <button
        v-if="nextCursor && items.length"
        type="button"
        class="more"
        :disabled="loadingMore"
        @click="loadMore"
      >
        {{ loadingMore ? 'Carregando…' : 'Carregar mais' }}
      </button>
    </main>

    <EncarteLightbox
      v-if="open"
      :encarte="open"
      @close="open = null"
    />
  </div>
</template>

<script setup lang="ts">
import { jboGet, type JboEncarte, type JboEncartesPage } from '~/utils/jboApi'

type Store = {
  id: string
  name: string
  slug: string
}

const establishmentId = ref('')
const open = ref<JboEncarte | null>(null)
const items = ref<JboEncarte[]>([])
const nextCursor = ref<string | null>(null)
const reloading = ref(false)
const loadingMore = ref(false)
const loadError = ref(false)
const loadMoreError = ref(false)
let requestGeneration = 0

const { data: storesData, error: storesError } = await useAsyncData(
  'jbo-encartes-stores',
  () => jboGet<{ items: Store[] }>('/establishments'),
)
const stores = computed(() => storesData.value?.items || [])
const storesLoadError = computed(() => Boolean(storesError.value))

function fetchPage(cursor: string | null, selectedEstablishment: string) {
  return jboGet<JboEncartesPage>('/encartes', {
    establishment_id: selectedEstablishment || undefined,
    cursor: cursor || undefined,
    page_size: 20,
  })
}

const {
  data: initialPage,
  pending: initialPending,
  error: initialError,
} = await useAsyncData(
  'jbo-encartes',
  () => fetchPage(null, ''),
)

items.value = initialPage.value?.items || []
nextCursor.value = initialPage.value?.next_cursor ?? null
loadError.value = Boolean(initialError.value)

const pending = computed(() => initialPending.value || reloading.value)

watch(establishmentId, async (selectedEstablishment) => {
  const generation = ++requestGeneration

  items.value = []
  nextCursor.value = null
  loadingMore.value = false
  loadError.value = false
  loadMoreError.value = false
  reloading.value = true

  try {
    const page = await fetchPage(null, selectedEstablishment)
    if (generation !== requestGeneration) return

    items.value = page.items
    nextCursor.value = page.next_cursor
  }
  catch {
    if (generation === requestGeneration) loadError.value = true
  }
  finally {
    if (generation === requestGeneration) reloading.value = false
  }
})

async function loadMore() {
  const cursor = nextCursor.value
  if (!cursor || loadingMore.value) return

  const generation = requestGeneration
  const selectedEstablishment = establishmentId.value
  loadingMore.value = true
  loadMoreError.value = false

  try {
    const page = await fetchPage(cursor, selectedEstablishment)
    if (generation !== requestGeneration) return

    items.value = [...items.value, ...page.items]
    nextCursor.value = page.next_cursor
  }
  catch {
    if (generation === requestGeneration) loadMoreError.value = true
  }
  finally {
    if (generation === requestGeneration) loadingMore.value = false
  }
}

useSeoMeta({
  title: 'Encartes | Joinville Boas Ofertas',
  description: 'Encartes das lojas de Joinville e região.',
})
</script>

<style scoped>
.page__main {
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  padding: 1.25rem 1rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
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

.filter {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: min(100%, 360px);
}

.filter__label {
  display: block;
}

.filter__error {
  margin: 0;
  color: #ffb2b5;
  font-size: 0.8rem;
}

.filter__select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.65rem 2.25rem 0.65rem 0.85rem;
  background: var(--navy-light);
  color: var(--white);
  font: inherit;
  font-size: 0.9rem;
}

.filter__select:focus {
  outline: 2px solid var(--yellow);
  outline-offset: 1px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 210px), 1fr));
  gap: 0.85rem;
}

.more {
  align-self: center;
  min-width: 150px;
  border: 1px solid var(--yellow);
  border-radius: 10px;
  padding: 0.65rem 1rem;
  background: var(--yellow);
  color: var(--navy);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 800;
  cursor: pointer;
}

.more:disabled {
  cursor: wait;
  opacity: 0.65;
}

.more-error {
  margin: 0;
  color: #ffb2b5;
  font-size: 0.82rem;
  text-align: center;
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
