<template>
  <header class="header">
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
    <nav class="header__nav" aria-label="Principal">
      <NuxtLink to="/privacidade">Privacidade</NuxtLink>
    </nav>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--border);
  background: rgba(13, 19, 29, 0.85);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 20;
}

.header__brand {
  display: flex;
  align-items: center;
  text-decoration: none;
}

.header__logo {
  height: 40px;
  width: auto;
}

.header__slot {
  flex: 1 1 220px;
  min-width: 0;
}

.header__nav {
  margin-left: auto;
  font-size: 0.85rem;
}

.header__nav a {
  color: var(--muted);
}

.header__nav a:hover {
  color: var(--yellow);
}
</style>
