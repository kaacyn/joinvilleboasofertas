<template>
  <div ref="rootRef" class="hmenu">
    <button
      type="button"
      class="hmenu__trigger"
      :aria-expanded="open"
      aria-haspopup="true"
      aria-label="Abrir menu"
      @click="toggle"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>

    <div
      v-if="open"
      class="hmenu__panel"
      role="menu"
      aria-label="Menu do site"
    >
      <NuxtLink
        to="/"
        class="hmenu__item"
        role="menuitem"
        @click="close"
      >
        Início
      </NuxtLink>
      <NuxtLink
        to="/lojas"
        class="hmenu__item"
        role="menuitem"
        @click="close"
      >
        Lojas
      </NuxtLink>
      <NuxtLink
        to="/encartes"
        class="hmenu__item"
        role="menuitem"
        @click="close"
      >
        Encartes
      </NuxtLink>
      <NuxtLink
        to="/envie-um-encarte"
        class="hmenu__item"
        role="menuitem"
        @click="close"
      >
        Envie um encarte
      </NuxtLink>
      <NuxtLink
        to="/perguntas-frequentes"
        class="hmenu__item"
        role="menuitem"
        @click="close"
      >
        Perguntas frequentes
      </NuxtLink>
      <NuxtLink
        to="/privacidade"
        class="hmenu__item"
        role="menuitem"
        @click="close"
      >
        Política de privacidade
      </NuxtLink>
      <NuxtLink
        to="/termos"
        class="hmenu__item"
        role="menuitem"
        @click="close"
      >
        Termos de uso
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const rootRef = ref<HTMLElement | null>(null)
const open = ref(false)

/**
 * Alterna o menu.
 */
function toggle() {
  open.value = !open.value
}

/**
 * Fecha o menu.
 */
function close() {
  open.value = false
}

/**
 * Fecha ao clicar fora ou pressionar Escape.
 */
function onDocClick(e: Event) {
  const t = e.target as Node
  if (rootRef.value && !rootRef.value.contains(t)) close()
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

watch(open, (v) => {
  if (v) {
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
  }
  else {
    document.removeEventListener('mousedown', onDocClick)
    document.removeEventListener('keydown', onKey)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.hmenu {
  position: relative;
  flex-shrink: 0;
}

.hmenu__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
}

.hmenu__trigger:hover,
.hmenu__trigger[aria-expanded="true"] {
  border-color: var(--ink-3);
}

.hmenu__panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: var(--shadow);
  padding: 6px;
  z-index: 30;
}

.hmenu__item {
  display: block;
  padding: 0.7rem 0.85rem;
  border-radius: 8px;
  color: var(--ink);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
}

.hmenu__item:hover,
.hmenu__item.router-link-active {
  background: var(--yellow-soft);
  color: var(--yellow-ink);
}
</style>
