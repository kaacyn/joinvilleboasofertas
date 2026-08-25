/** Atalhos estáticos da home (Stories) → filtros `q` + categoria. */

export type FacetCategory = { id: string, name: string }

export type StoryShortcut = {
  id: string
  label: string
  q: string
  categoryNames: string[]
  image: string
}

export const STORY_SHORTCUTS: StoryShortcut[] = [
  { id: 'ovos', label: 'Ovos', q: 'Ovos', categoryNames: ['Hortifruti', 'Mercearia'], image: '/shortcuts/ovos.webp' },
  { id: 'cafe', label: 'Café', q: 'Café', categoryNames: ['Mercearia'], image: '/shortcuts/cafe.webp' },
  { id: 'leite', label: 'Leite', q: 'Leite', categoryNames: ['Laticínios'], image: '/shortcuts/leite.webp' },
  { id: 'arroz', label: 'Arroz', q: 'Arroz', categoryNames: ['Mercearia'], image: '/shortcuts/arroz.webp' },
  { id: 'feijao', label: 'Feijão', q: 'Feijão', categoryNames: ['Mercearia'], image: '/shortcuts/feijao.webp' },
  { id: 'oleo', label: 'Óleo', q: 'Óleo', categoryNames: ['Mercearia'], image: '/shortcuts/oleo.webp' },
  { id: 'frango', label: 'Frango', q: 'Frango', categoryNames: ['Açougue'], image: '/shortcuts/frango.webp' },
  { id: 'acougue', label: 'Açougue', q: '', categoryNames: ['Açougue'], image: '/shortcuts/acougue.webp' },
]

/**
 * Normaliza nome para comparar sem acento/caixa.
 */
export function normalizeShortcutText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

/**
 * Acha o id da facet cujo nome bate com ``categoryName``.
 */
export function findCategoryId(
  categories: FacetCategory[],
  categoryName: string,
): string | undefined {
  const target = normalizeShortcutText(categoryName)
  return categories.find(c => normalizeShortcutText(c.name) === target)?.id
}

/**
 * Patch de filtros correspondente ao atalho (categorias viram lista de ids).
 */
export function shortcutToFilterPatch(
  shortcut: StoryShortcut,
  categories: FacetCategory[],
): { q: string, category_ids: string[] } {
  const category_ids = shortcut.categoryNames
    .map(name => findCategoryId(categories, name))
    .filter((id): id is string => Boolean(id))
  return {
    q: shortcut.q,
    category_ids,
  }
}

/**
 * True se o estado atual é exatamente o filtro desse atalho.
 */
export function isShortcutActive(
  shortcut: StoryShortcut,
  state: { q: string, category_ids: string[] },
  categories: FacetCategory[],
): boolean {
  const patch = shortcutToFilterPatch(shortcut, categories)
  if ((state.q || '') !== patch.q) return false
  if (patch.category_ids.length !== state.category_ids.length) return false
  if (patch.category_ids.length === 0) return true
  const want = new Set(patch.category_ids)
  return state.category_ids.every(id => want.has(id))
}

/**
 * Aplica o atalho; se já estiver ativo, limpa busca e categorias.
 */
export function nextShortcutPatch(
  shortcut: StoryShortcut,
  state: { q: string, category_ids: string[] },
  categories: FacetCategory[],
): { q: string, category_ids: string[] } {
  if (isShortcutActive(shortcut, state, categories)) {
    return { q: '', category_ids: [] }
  }
  return shortcutToFilterPatch(shortcut, categories)
}
