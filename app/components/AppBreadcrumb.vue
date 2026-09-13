<template>
  <nav class="crumbs" aria-label="Trilha">
    <ol class="crumbs__list">
      <li
        v-for="(item, i) in items"
        :key="`${item.label}-${i}`"
        class="crumbs__item"
        :class="{ 'crumbs__item--current': !item.to }"
      >
        <NuxtLink
          v-if="item.to"
          class="crumbs__link"
          :to="item.to"
          :title="item.label"
        >
          {{ item.label }}
        </NuxtLink>
        <span
          v-else
          class="crumbs__current"
          aria-current="page"
          :title="item.label"
        >
          {{ item.label }}
        </span>
        <svg
          v-if="i < items.length - 1"
          class="crumbs__sep"
          viewBox="0 0 16 16"
          width="12"
          height="12"
          aria-hidden="true"
        >
          <path
            d="M6 3.5 10.5 8 6 12.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
export type Crumb = {
  label: string
  to?: string
}

defineProps<{
  items: Crumb[]
}>()
</script>

<style scoped>
.crumbs__list {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  margin: 0;
  padding: 0;
  list-style: none;
  min-width: 0;
}

.crumbs__item {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  min-width: 0;
  flex: 0 1 auto;
}

.crumbs__item:first-child {
  flex-shrink: 0;
}

.crumbs__item--current {
  flex: 1 1 auto;
}

.crumbs__link,
.crumbs__current {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  font-size: 0.82rem;
  line-height: 1.2;
}

.crumbs__link {
  color: var(--ink-2);
  font-weight: 600;
  text-decoration: none;
  padding: 0.45rem 0;
}

.crumbs__link:hover,
.crumbs__link:focus-visible {
  color: var(--ink);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.crumbs__link:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
  border-radius: 4px;
}

.crumbs__current {
  color: var(--ink-3);
  font-weight: 500;
}

.crumbs__sep {
  flex-shrink: 0;
  color: var(--ink-3);
}
</style>
