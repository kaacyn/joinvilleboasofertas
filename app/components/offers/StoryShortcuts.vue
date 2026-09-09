<template>
  <nav class="stories" aria-label="Atalhos de ofertas">
    <button
      v-for="item in STORY_SHORTCUTS"
      :key="item.id"
      type="button"
      class="stories__item"
      :class="{ 'stories__item--active': isActive(item) }"
      :aria-pressed="isActive(item)"
      @click="emit('select', item)"
    >
      <span class="stories__ring">
        <img
          class="stories__img"
          :src="item.image"
          :alt="item.label"
          width="64"
          height="64"
        >
      </span>
      <span class="stories__label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import {
  STORY_SHORTCUTS,
  isShortcutActive,
  type StoryShortcut,
} from '~/utils/storyShortcuts'

const props = defineProps<{
  q: string
  categoryIds: string[]
  categories: { id: string, name: string }[]
}>()

const emit = defineEmits<{
  select: [StoryShortcut]
}>()

function isActive(item: StoryShortcut): boolean {
  return isShortcutActive(
    item,
    { q: props.q, category_ids: props.categoryIds },
    props.categories,
  )
}
</script>

<style scoped>
.stories {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.85rem;
  padding: 0.15rem 0.15rem 0.35rem;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
}

.stories::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.stories__item {
  flex: 0 0 auto;
  width: 4.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--white);
  cursor: pointer;
}

.stories__ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4.15rem;
  height: 4.15rem;
  border-radius: 50%;
  padding: 3px;
  background: rgba(255, 255, 255, 0.18);
}

.stories__item--active .stories__ring {
  background: linear-gradient(135deg, var(--yellow), var(--red));
}

.stories__img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  background: var(--navy-light);
}

.stories__label {
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.15;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stories__item--active .stories__label {
  color: var(--yellow);
}
</style>
