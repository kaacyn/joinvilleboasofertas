/** Emoji e fundo suave por slug de categoria (ordem e cores do protótipo). */

export type CategoryIcon = { emoji: string, bg: string }

export const CATEGORY_ICONS: Record<string, CategoryIcon> = {
  acougue: { emoji: '🥩', bg: '#FDE7E8' },
  hortifruti: { emoji: '🥦', bg: '#DCFCE7' },
  laticinios: { emoji: '🧀', bg: '#FFF3BF' },
  bebidas: { emoji: '🧃', bg: '#E0F2FE' },
  padaria: { emoji: '🥖', bg: '#FFEDD5' },
  limpeza: { emoji: '🧴', bg: '#EDE9FE' },
  higiene: { emoji: '🧼', bg: '#FCE7F3' },
  mercearia: { emoji: '🛒', bg: '#EEF0F3' },
  congelados: { emoji: '🧊', bg: '#E0F2FE' },
  frios: { emoji: '🥓', bg: '#FDE7E8' },
  bebe: { emoji: '🍼', bg: '#FCE7F3' },
  pet: { emoji: '🐾', bg: '#FFEDD5' },
  outros: { emoji: '🧺', bg: '#EEF0F3' },
}

/** Ordem de exibição do protótipo; "outros" fica por último. */
export const CATEGORY_ORDER = Object.keys(CATEGORY_ICONS)

const FALLBACK: CategoryIcon = { emoji: '🛒', bg: '#EEF0F3' }
const LAST = 'outros'

/** Normaliza o slug (caixa baixa, sem espaços nas pontas). */
function normalizeSlug(slug: string | null | undefined): string {
  return String(slug || '').trim().toLowerCase()
}

/** Ícone da categoria; carrinho cinza quando o slug é desconhecido. */
export function categoryIcon(slug: string | null | undefined): CategoryIcon {
  return CATEGORY_ICONS[normalizeSlug(slug)] || FALLBACK
}

type CategoryLike = { slug?: string | null, name: string }

/** Posição de ordenação: conhecidos pelo protótipo, desconhecidos depois, "outros" por último. */
function rank(category: CategoryLike): number {
  const slug = normalizeSlug(category.slug)
  if (slug === LAST) return CATEGORY_ORDER.length + 1
  const index = CATEGORY_ORDER.indexOf(slug)
  return index === -1 ? CATEGORY_ORDER.length : index
}

/** Ordena categorias para a grade da home sem mutar a lista original. */
export function orderCategories<T extends CategoryLike>(categories: T[]): T[] {
  return [...categories].sort((a, b) =>
    rank(a) - rank(b) || a.name.localeCompare(b.name, 'pt-BR'),
  )
}
