<template>
  <div class="filterbar">
    <div class="filterbar__chips">
      <FilterChipDropdown
        label="Categorias"
        :active-count="categoryIds.length"
        @open="catSearch = ''"
      >
        <template #default="{ close }">
          <div v-if="facets.categories.length" class="popover">
            <div class="popover__search">
              <input
                v-model="catSearch"
                type="search"
                class="popover__search-input"
                placeholder="Buscar categoria"
                aria-label="Buscar categoria"
                autocomplete="off"
              >
            </div>
            <div class="popover__list">
              <label
                v-for="c in filteredCategories"
                :key="c.id"
                class="popover__row"
              >
                <input
                  type="checkbox"
                  :checked="draftCatIds.includes(c.id)"
                  @change="toggleId(draftCatIds, c.id)"
                >
                <span>{{ c.name }}</span>
              </label>
              <p v-if="!filteredCategories.length" class="popover__empty">
                Nenhuma categoria encontrada
              </p>
            </div>
            <div class="popover__actions">
              <button type="button" class="popover__clear" @click="draftCatIds = []">
                Limpar
              </button>
              <button
                type="button"
                class="popover__apply"
                @click="applyCategories(close)"
              >
                Aplicar
              </button>
            </div>
          </div>
          <p v-else class="popover__empty">Sem categorias disponíveis</p>
        </template>
      </FilterChipDropdown>

      <FilterChipDropdown
        label="Lojas"
        :active-count="establishmentIds.length"
        @open="estSearch = ''"
      >
        <template #default="{ close }">
          <div v-if="facets.establishments.length" class="popover">
            <div class="popover__search">
              <input
                v-model="estSearch"
                type="search"
                class="popover__search-input"
                placeholder="Buscar loja"
                aria-label="Buscar loja"
                autocomplete="off"
              >
            </div>
            <div class="popover__list">
              <label
                v-for="e in filteredEstablishments"
                :key="e.id"
                class="popover__row"
              >
                <input
                  type="checkbox"
                  :checked="draftEstIds.includes(e.id)"
                  @change="toggleId(draftEstIds, e.id)"
                >
                <span>{{ e.name }}</span>
              </label>
              <p v-if="!filteredEstablishments.length" class="popover__empty">
                Nenhuma loja encontrada
              </p>
            </div>
            <div class="popover__actions">
              <button type="button" class="popover__clear" @click="draftEstIds = []">
                Limpar
              </button>
              <button
                type="button"
                class="popover__apply"
                @click="applyEstablishments(close)"
              >
                Aplicar
              </button>
            </div>
          </div>
          <p v-else class="popover__empty">Sem lojas disponíveis</p>
        </template>
      </FilterChipDropdown>

      <FilterChipDropdown
        :label="sortLabel"
        :active-count="sort !== 'recent' ? 1 : 0"
        @open="draftSort = sort"
      >
        <template #default="{ close }">
          <div class="popover">
            <div class="popover__list">
              <button
                v-for="opt in sortOptions"
                :key="opt.value"
                type="button"
                class="popover__opt"
                :class="{ 'popover__opt--on': draftSort === opt.value }"
                @click="draftSort = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
            <div class="popover__actions">
              <button type="button" class="popover__clear" @click="draftSort = 'recent'">
                Limpar
              </button>
              <button
                type="button"
                class="popover__apply"
                @click="applySort(close)"
              >
                Aplicar
              </button>
            </div>
          </div>
        </template>
      </FilterChipDropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { JboFacets } from '~/utils/jboApi'

const props = defineProps<{
  facets: JboFacets
  categoryIds: string[]
  establishmentIds: string[]
  sort: string
}>()

const emit = defineEmits<{
  'update:sort': [string]
  applyCategories: [string[]]
  applyEstablishments: [string[]]
}>()

const sortOptions = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'price', label: 'Menor preço' },
  { value: 'savings', label: 'Maior economia' },
] as const

const draftCatIds = ref<string[]>([...props.categoryIds])
const draftEstIds = ref<string[]>([...props.establishmentIds])
const draftSort = ref(props.sort)
const catSearch = ref('')
const estSearch = ref('')

watch(() => props.categoryIds, (v) => { draftCatIds.value = [...v] })
watch(() => props.establishmentIds, (v) => { draftEstIds.value = [...v] })
watch(() => props.sort, (v) => { draftSort.value = v })

const sortLabel = computed(() =>
  sortOptions.find(o => o.value === props.sort)?.label || 'Mais recentes',
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
 * Alterna id em array reativo de draft.
 */
function toggleId(arr: string[], id: string) {
  const i = arr.indexOf(id)
  if (i >= 0) arr.splice(i, 1)
  else arr.push(id)
}

/**
 * Aplica categorias selecionadas e fecha o chip.
 */
function applyCategories(close: () => void) {
  emit('applyCategories', [...draftCatIds.value])
  close()
}

/**
 * Aplica mercados selecionados e fecha o chip.
 */
function applyEstablishments(close: () => void) {
  emit('applyEstablishments', [...draftEstIds.value])
  close()
}

/**
 * Aplica ordenação escolhida e fecha o chip.
 */
function applySort(close: () => void) {
  emit('update:sort', draftSort.value)
  close()
}
</script>

<style scoped>
.filterbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  position: sticky;
  top: 64px;
  z-index: 15;
  background: rgba(13, 19, 29, 0.92);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(8px);
}

.filterbar__chips {
  display: flex;
  flex-wrap: nowrap;
  gap: 0;
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1;
  min-width: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
}

.filterbar__chips::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.filterbar__chips > * + * {
  border-left: 1px solid var(--border);
}

.popover {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
  min-height: 0;
  height: 100%;
}

.popover__search {
  flex-shrink: 0;
  padding-bottom: 8px;
}

.popover__search-input {
  width: 100%;
  height: 36px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  font: inherit;
  font-size: 0.85rem;
  color: #fff;
  background: var(--navy, #0d131d);
  outline: none;
}

.popover__search-input:focus {
  border-color: var(--yellow, #ffc800);
}

.popover__list {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.popover__list::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.popover__row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px;
  font-size: 0.9rem;
  cursor: pointer;
  min-width: 0;
}

.popover__row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.popover__opt {
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
}

.popover__opt--on {
  background: rgba(255, 200, 0, 0.15);
  border-color: var(--yellow, #ffc800);
  color: var(--yellow, #ffc800);
  font-weight: 700;
}

.popover__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 8px;
}

.popover__clear,
.popover__apply {
  flex: 1;
  height: 36px;
  border-radius: 8px;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

.popover__clear {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
}

.popover__apply {
  background: var(--yellow, #ffc800);
  color: var(--navy, #0d131d);
  border: none;
}

.popover__empty {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  margin: 0;
  padding: 8px 4px;
}
</style>
