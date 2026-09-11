<template>
  <div class="cats">
    <NuxtLink
      v-for="c in visible"
      :key="c.slug"
      class="cat"
      :to="`/categoria/${c.slug}`"
    >
      <span class="cat__icon" :style="{ background: categoryIcon(c.slug).bg }" aria-hidden="true">
        {{ categoryIcon(c.slug).emoji }}
      </span>
      <span class="cat__name">{{ c.name }}</span>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { categoryIcon, orderCategories } from '~/utils/categoryIcons'
import type { JboFacetItem } from '~/utils/jboApi'

type CategoryWithSlug = { id: string, name: string, slug: string }

const props = withDefaults(defineProps<{
  categories: JboFacetItem[]
  /** Mostra todas em vez das primeiras `limit`. */
  expanded?: boolean
  limit?: number
}>(), {
  expanded: false,
  limit: 8,
})

/** Só categorias com slug (sem slug não há página para linkar), na ordem do protótipo. */
const ordered = computed<CategoryWithSlug[]>(() =>
  orderCategories(
    props.categories
      .filter(c => Boolean(c.slug))
      .map(c => ({ id: c.id, name: c.name, slug: String(c.slug) })),
  ),
)

const visible = computed(() => props.expanded ? ordered.value : ordered.value.slice(0, props.limit))
</script>

<style scoped>
.cats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.cat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 6px 10px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  color: var(--ink-2);
  font-size: 11.5px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
}

.cat:hover {
  border-color: var(--ink-3);
  text-decoration: none;
}

.cat__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  font-size: 20px;
}

.cat__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
</style>
