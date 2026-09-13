<template>
  <header class="header" :class="{ 'header--sticky': sticky }">
    <NuxtLink to="/" class="header__brand" aria-label="Joinville Boas Ofertas — início">
      <img
        class="header__logo"
        src="/assets/logo.webp"
        width="160"
        height="48"
        alt="Joinville Boas Ofertas"
      >
    </NuxtLink>
    <div v-if="$slots.default" class="header__slot">
      <slot />
    </div>
    <InstallAppButton />
    <HeaderMenu />
    <div
      class="header__loading"
      :class="{ 'header__loading--active': isLoading }"
      :style="{ transform: `scaleX(${Math.max(progress, 2) / 100})` }"
      role="progressbar"
      :aria-valuenow="Math.round(progress)"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="Carregando página"
      :aria-hidden="isLoading ? 'false' : 'true'"
    />
  </header>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  /** Se falso, o logo sobe com a página e não gruda na busca nem no filtro. */
  sticky?: boolean
}>(), {
  sticky: true,
})

/** Barra fina sob o menu durante navegação entre páginas. */
const { progress, isLoading } = useLoadingIndicator({
  duration: 2500,
  throttle: 120,
  hideDelay: 350,
})
</script>

<style scoped>
.header {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}

.header--sticky {
  position: sticky;
  top: 0;
  z-index: 20;
}

.header__brand {
  display: flex;
  align-items: center;
  text-decoration: none;
  flex-shrink: 0;
  margin-right: auto;
  cursor: pointer;
}

.header__logo {
  height: 40px;
  width: auto;
}

.header__slot {
  flex: 1;
  min-width: 0;
}

.header__loading {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  pointer-events: none;
  background: var(--yellow);
  transform: scaleX(0);
  transform-origin: left center;
  opacity: 0;
  transition: transform 0.12s ease-out, opacity 0.35s ease;
}

.header__loading--active {
  opacity: 1;
}
</style>
