<template>
  <section class="hsec" :class="{ 'hsec--bleed': bleed }" :aria-label="title || undefined">
    <div v-if="title || $slots.aside" class="hsec__head">
      <div v-if="title" class="hsec__titles">
        <h2 class="hsec__title">{{ title }}</h2>
        <p v-if="subtitle" class="hsec__subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.aside" class="hsec__aside">
        <slot name="aside" />
      </div>
    </div>
    <slot />
  </section>
</template>

<script setup lang="ts">
/** Seção da home: título Montserrat à esquerda, ação/pill à direita, conteúdo abaixo. */
withDefaults(defineProps<{
  title?: string
  /** Linha curta abaixo do título (ex.: "Onde comprar ovos hoje"). */
  subtitle?: string
  /** Sem padding lateral (carrossel que sangra até a borda). */
  bleed?: boolean
}>(), {
  title: '',
  subtitle: '',
  bleed: false,
})
</script>

<style scoped>
.hsec {
  max-width: 720px;
  margin: 0 auto;
  padding: 22px 16px 0;
}

.hsec--bleed {
  padding-left: 0;
  padding-right: 0;
}

.hsec--bleed .hsec__head {
  padding: 0 16px;
}

.hsec__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.hsec__titles {
  min-width: 0;
}

.hsec__title {
  margin: 0;
  font-family: var(--head);
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--ink);
}

.hsec__subtitle {
  margin: 2px 0 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-2);
}

.hsec__aside {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
}

.hsec__aside :deep(a),
.hsec__aside :deep(button) {
  font: inherit;
  color: var(--ink-2);
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  text-decoration: none;
}

.hsec__aside :deep(a:hover),
.hsec__aside :deep(button:hover) {
  text-decoration: underline;
}
</style>
