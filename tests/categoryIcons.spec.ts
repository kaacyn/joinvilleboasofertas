import { describe, expect, it } from 'vitest'
import { CATEGORY_ORDER, categoryIcon, orderCategories } from '../app/utils/categoryIcons'

describe('categoryIcons', () => {
  it('ordem do protótipo começa em açougue e termina em outros', () => {
    expect(CATEGORY_ORDER[0]).toBe('acougue')
    expect(CATEGORY_ORDER[CATEGORY_ORDER.length - 1]).toBe('outros')
    expect(CATEGORY_ORDER).toHaveLength(13)
  })

  it('ícone conhecido e fallback', () => {
    expect(categoryIcon('hortifruti')).toEqual({ emoji: '🥦', bg: '#DCFCE7' })
    expect(categoryIcon('Hortifruti ')).toEqual({ emoji: '🥦', bg: '#DCFCE7' })
    expect(categoryIcon('inexistente')).toEqual({ emoji: '🛒', bg: '#EEF0F3' })
    expect(categoryIcon(null)).toEqual({ emoji: '🛒', bg: '#EEF0F3' })
  })

  it('ordena pelo protótipo, desconhecidos por nome e outros por último', () => {
    const ordered = orderCategories([
      { slug: 'outros', name: 'Outros' },
      { slug: 'zeta', name: 'Zeta' },
      { slug: 'bebidas', name: 'Bebidas' },
      { slug: 'alfa', name: 'Alfa' },
      { slug: 'acougue', name: 'Açougue' },
    ])
    expect(ordered.map(c => c.slug)).toEqual(['acougue', 'bebidas', 'alfa', 'zeta', 'outros'])
  })
})
