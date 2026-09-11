<template>
  <div class="ac" :class="{ 'ac--open': open }">
    <input
      :id="inputId"
      ref="inputRef"
      type="search"
      class="ac__input"
      role="combobox"
      :value="localValue"
      :placeholder="placeholder"
      :aria-expanded="showPanel ? 'true' : 'false'"
      :aria-controls="listboxId"
      :aria-activedescendant="activeIndex >= 0 ? optionId(activeIndex) : undefined"
      autocomplete="off"
      enterkeyhint="search"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKeydown"
    >
    <div v-if="showPanel" class="ac__panel">
      <ul v-if="items.length" :id="listboxId" class="ac__list" role="listbox">
        <li
          v-for="(item, i) in items"
          :id="optionId(i)"
          :key="item.id ?? i"
          class="ac__item"
          :class="{ 'ac__item--active': activeIndex === i }"
          role="option"
          :aria-selected="activeIndex === i ? 'true' : 'false'"
          @mousedown.prevent="pickAt(i)"
          @mousemove="activeIndex = i"
        >
          <slot name="item" :item="item" :active="activeIndex === i" :index="i">
            {{ item.name }}
          </slot>
        </li>
      </ul>
      <div v-else-if="error" class="ac__status ac__status--error">
        <slot name="error">Erro ao buscar sugestões</slot>
      </div>
      <div v-else-if="loading" class="ac__status">
        <slot name="loading">Buscando…</slot>
      </div>
      <div v-else class="ac__status">
        <slot name="empty">Nenhum resultado</slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { JboSuggestItem } from '~/utils/jboApi'

const props = withDefaults(defineProps<{
  modelValue?: string
  fetcher: (q: string, ctx: { signal: AbortSignal }) => Promise<JboSuggestItem[]>
  placeholder?: string
  inputId?: string
  minChars?: number
  debounceMs?: number
}>(), {
  modelValue: '',
  placeholder: '',
  inputId: undefined,
  minChars: 1,
  debounceMs: 200,
})

const emit = defineEmits<{
  'update:modelValue': [string]
  select: [JboSuggestItem]
  submit: [string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const localValue = ref(props.modelValue)

const ac = useAutocomplete<JboSuggestItem>({
  fetcher: props.fetcher,
  minChars: props.minChars,
  debounceMs: props.debounceMs,
  onSelect: (item) => {
    localValue.value = item.name ?? localValue.value
    emit('update:modelValue', localValue.value)
    emit('select', item)
  },
  onSubmit: (q) => emit('submit', q),
})

const {
  items,
  loading,
  error,
  open,
  activeIndex,
  listboxId,
  optionId,
  onInputKeydown,
  selectAt,
  setQuery,
  close,
  reopenIfHasItems,
} = ac

const showPanel = computed(() => {
  if (localValue.value.length < props.minChars) return false
  return open.value
})

let blurTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.modelValue, (v) => {
  if (v !== localValue.value) {
    localValue.value = v
    // Atalhos Stories / URL: preenche o input sem abrir o autocomplete
    setQuery(v, { fetch: false })
  }
})

function onInput(e: Event) {
  const t = e.target as HTMLInputElement
  localValue.value = t.value
  emit('update:modelValue', localValue.value)
  setQuery(localValue.value)
}

function onFocus() {
  if (blurTimer) {
    clearTimeout(blurTimer)
    blurTimer = null
  }
  if (localValue.value && items.value.length) reopenIfHasItems()
}

function onBlur() {
  if (blurTimer) clearTimeout(blurTimer)
  blurTimer = setTimeout(() => {
    blurTimer = null
    close()
  }, 100)
}

function onKeydown(ev: KeyboardEvent) {
  onInputKeydown(ev)
}

function pickAt(i: number) {
  selectAt(i)
}

onBeforeUnmount(() => {
  if (blurTimer) clearTimeout(blurTimer)
})

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
})
</script>

<style scoped>
.ac {
  position: relative;
  width: 100%;
}

.ac__input {
  width: 100%;
  min-width: 0;
  height: 50px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  border-radius: 16px;
  padding: 0 14px;
  font: inherit;
  font-size: 0.95rem;
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

.ac__input::placeholder {
  color: var(--ink-3);
}

.ac__input:focus {
  outline: 2px solid var(--yellow);
  outline-offset: 1px;
}

.ac__panel {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  z-index: 30;
}

.ac__list {
  margin: 0;
  padding: 0.25rem 0;
  list-style: none;
  max-height: 50vh;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: var(--shadow);
}

.ac__item {
  padding: 0.65rem 0.85rem;
  font-size: 0.95rem;
  cursor: pointer;
  color: var(--ink);
}

.ac__item--active,
.ac__item:hover {
  background: var(--bg);
  color: var(--ink);
}

.ac__status {
  padding: 0.75rem 0.85rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
  font-size: 0.85rem;
}

.ac__status--error {
  color: var(--red);
}
</style>
