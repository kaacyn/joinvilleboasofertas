<template>
  <div class="search" role="search">
    <label class="sr-only" for="jbo-search">Buscar ofertas</label>
    <SearchAutocomplete
      ref="acRef"
      class="search__field"
      :model-value="modelValue"
      input-id="jbo-search"
      placeholder="Buscar produto ou loja…"
      :fetcher="fetchProductSuggestions"
      :min-chars="1"
      @update:model-value="onUpdate"
      @select="onSelect"
      @submit="onSubmit"
    >
      <template #empty>Nenhum resultado para “{{ modelValue }}”</template>
    </SearchAutocomplete>
  </div>
</template>

<script setup lang="ts">
import { fetchProductSuggestions, type JboSuggestItem } from '~/utils/jboApi'

defineProps<{ modelValue: string }>()
const emit = defineEmits<{
  'update:modelValue': [string]
  submit: []
}>()

const acRef = ref<{ focus?: () => void, blur?: () => void } | null>(null)

function onUpdate(v: string) {
  emit('update:modelValue', v)
}

/** Escolhe sugestão e aplica a busca imediatamente. */
function onSelect(item: JboSuggestItem) {
  emit('update:modelValue', item.name)
  acRef.value?.blur?.()
  nextTick(() => emit('submit'))
}

/** Aplica a busca pelo texto digitado e fecha o teclado no smartphone. */
function onSubmit(q: string) {
  emit('update:modelValue', (q || '').trim())
  acRef.value?.blur?.()
  nextTick(() => emit('submit'))
}
</script>

<style scoped>
.search {
  display: flex;
  width: 100%;
}

.search__field {
  flex: 1;
  min-width: 0;
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
