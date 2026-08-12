<template>
  <form class="search" role="search" @submit.prevent="emit('submit')">
    <label class="sr-only" for="jbo-search">Buscar ofertas</label>
    <input
      id="jbo-search"
      :value="modelValue"
      type="search"
      class="search__input"
      placeholder="Buscar produto ou mercado…"
      autocomplete="off"
      @input="onInput"
    >
    <button class="search__btn" type="submit">Buscar</button>
  </form>
</template>

<script setup lang="ts">
defineProps<{ modelValue: string }>()
const emit = defineEmits<{
  'update:modelValue': [string]
  submit: []
}>()

/**
 * Emite o texto digitado para o v-model do pai.
 */
function onInput(e: Event) {
  const t = e.target as HTMLInputElement
  emit('update:modelValue', t.value)
}
</script>

<style scoped>
.search {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

.search__input {
  flex: 1;
  min-width: 0;
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

.search__btn {
  border: none;
  background: var(--yellow);
  color: var(--navy);
  font-weight: 800;
  border-radius: 10px;
  padding: 0 1rem;
  cursor: pointer;
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
