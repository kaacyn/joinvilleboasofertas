<template>
  <div class="filter-bar">
    <button type="button" class="filter-bar__btn" @click="emit('open-sheet')">
      Filtros
      <span v-if="activeCount > 0" class="filter-bar__badge">{{ activeCount }}</span>
    </button>
    <select
      class="filter-bar__sort"
      :value="sort"
      aria-label="Ordenar"
      @change="onSort"
    >
      <option value="recent">Mais recentes</option>
      <option value="price">Menor preço</option>
      <option value="savings">Maior economia</option>
    </select>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  activeCount: number
  sort: string
}>()

const emit = defineEmits<{
  'open-sheet': []
  'update:sort': [string]
}>()

/**
 * Propaga mudança de ordenação.
 */
function onSort(e: Event) {
  const t = e.target as HTMLSelectElement
  emit('update:sort', t.value)
}
</script>

<style scoped>
.filter-bar {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  position: sticky;
  top: 64px;
  z-index: 15;
  background: rgba(13, 19, 29, 0.9);
  border-bottom: 1px solid var(--border);
}

.filter-bar__btn,
.filter-bar__sort {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--white);
  border-radius: 999px;
  padding: 0.45rem 0.9rem;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

.filter-bar__badge {
  display: inline-block;
  margin-left: 0.35rem;
  background: var(--yellow);
  color: var(--navy);
  border-radius: 999px;
  padding: 0 0.4rem;
  font-size: 0.75rem;
}

.filter-bar__sort {
  margin-left: auto;
}
</style>
