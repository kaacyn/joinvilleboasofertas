<template>
  <Teleport to="body">
    <div v-if="open" class="sheet" role="dialog" aria-modal="true" aria-label="Filtros">
      <button type="button" class="sheet__backdrop" aria-label="Fechar" @click="close" />
      <div class="sheet__panel">
        <header class="sheet__head">
          <h2>Filtros</h2>
          <button type="button" class="sheet__close" @click="close">Fechar</button>
        </header>

        <section class="sheet__section">
          <h3>Categorias</h3>
          <input
            v-model="catSearch"
            type="search"
            class="sheet__search"
            placeholder="Buscar categoria"
            aria-label="Buscar categoria"
          >
          <label
            v-for="c in filteredCategories"
            :key="c.id"
            class="sheet__check"
          >
            <input
              type="checkbox"
              :checked="draft.category_ids.includes(c.id)"
              @change="toggleId('category_ids', c.id)"
            >
            {{ c.name }}
          </label>
          <p v-if="!filteredCategories.length" class="sheet__empty">
            Nenhuma categoria encontrada
          </p>
        </section>

        <section class="sheet__section">
          <h3>Lojas</h3>
          <input
            v-model="estSearch"
            type="search"
            class="sheet__search"
            placeholder="Buscar loja"
            aria-label="Buscar loja"
          >
          <label
            v-for="e in filteredEstablishments"
            :key="e.id"
            class="sheet__check"
          >
            <input
              type="checkbox"
              :checked="draft.establishment_ids.includes(e.id)"
              @change="toggleId('establishment_ids', e.id)"
            >
            {{ e.name }}
          </label>
          <p v-if="!filteredEstablishments.length" class="sheet__empty">
            Nenhuma loja encontrada
          </p>
        </section>

        <section class="sheet__section sheet__row">
          <label>
            Preço mín.
            <input v-model.number="draft.price_min" type="number" min="0" step="0.01">
          </label>
          <label>
            Preço máx.
            <input v-model.number="draft.price_max" type="number" min="0" step="0.01">
          </label>
        </section>

        <footer class="sheet__foot">
          <button type="button" class="sheet__ghost" @click="clear">Limpar</button>
          <button type="button" class="sheet__apply" @click="apply">Aplicar</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { JboFacets } from '~/utils/jboApi'

type Draft = {
  category_ids: string[]
  establishment_ids: string[]
  price_min?: number | null
  price_max?: number | null
}

const props = defineProps<{
  open: boolean
  facets: JboFacets
  applied: Draft
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  apply: [Draft]
  clear: []
}>()

const draft = reactive<Draft>({
  category_ids: [],
  establishment_ids: [],
  price_min: null,
  price_max: null,
})

const catSearch = ref('')
const estSearch = ref('')

watch(
  () => props.open,
  (v) => {
    if (!v) return
    draft.category_ids = [...props.applied.category_ids]
    draft.establishment_ids = [...props.applied.establishment_ids]
    draft.price_min = props.applied.price_min ?? null
    draft.price_max = props.applied.price_max ?? null
    catSearch.value = ''
    estSearch.value = ''
  },
)

/**
 * Normaliza texto para busca sem acento.
 */
function normalizeText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

/**
 * Verifica se o nome contém a query.
 */
function matchesQuery(name: string, query: string): boolean {
  const q = normalizeText(query).trim()
  if (!q) return true
  return normalizeText(name).includes(q)
}

const filteredCategories = computed(() =>
  (props.facets.categories || []).filter(c => matchesQuery(c.name, catSearch.value)),
)

const filteredEstablishments = computed(() =>
  (props.facets.establishments || []).filter(e => matchesQuery(e.name, estSearch.value)),
)

/**
 * Alterna id em lista de filtros do draft.
 */
function toggleId(key: 'category_ids' | 'establishment_ids', id: string) {
  const list = draft[key]
  const i = list.indexOf(id)
  if (i >= 0) list.splice(i, 1)
  else list.push(id)
}

/**
 * Fecha o sheet sem aplicar.
 */
function close() {
  emit('update:open', false)
}

/**
 * Limpa filtros e fecha.
 */
function clear() {
  emit('clear')
  emit('update:open', false)
}

/**
 * Aplica draft e fecha.
 */
function apply() {
  emit('apply', {
    category_ids: [...draft.category_ids],
    establishment_ids: [...draft.establishment_ids],
    price_min: draft.price_min || null,
    price_max: draft.price_max || null,
  })
  emit('update:open', false)
}
</script>

<style scoped>
.sheet {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sheet__backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  cursor: pointer;
}

.sheet__panel {
  position: relative;
  width: min(520px, 100%);
  max-height: 85vh;
  overflow: auto;
  background: var(--navy-light);
  border-radius: 16px 16px 0 0;
  padding: 1rem 1rem 1.25rem;
  border: 1px solid var(--border);
}

.sheet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.sheet__head h2 {
  margin: 0;
  font-size: 1.1rem;
}

.sheet__close {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font: inherit;
}

.sheet__section {
  margin-bottom: 1rem;
}

.sheet__section h3 {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.sheet__search {
  width: 100%;
  margin-bottom: 0.5rem;
  border: 1px solid var(--border);
  background: var(--navy);
  color: var(--white);
  border-radius: 8px;
  padding: 0.5rem 0.65rem;
  font: inherit;
  font-size: 0.85rem;
}

.sheet__empty {
  color: var(--muted);
  font-size: 0.85rem;
  margin: 0.25rem 0 0;
}

.sheet__check {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.35rem 0;
  font-size: 0.9rem;
}

.sheet__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.sheet__row label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--muted);
}

.sheet__row input {
  border: 1px solid var(--border);
  background: var(--navy);
  color: var(--white);
  border-radius: 8px;
  padding: 0.5rem;
  font: inherit;
}

.sheet__foot {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.sheet__ghost,
.sheet__apply {
  flex: 1;
  border-radius: 10px;
  padding: 0.75rem;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.sheet__ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--white);
}

.sheet__apply {
  background: var(--yellow);
  border: none;
  color: var(--navy);
}
</style>
