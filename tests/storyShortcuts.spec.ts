import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  STORY_SHORTCUTS,
  findCategoryId,
  isShortcutActive,
  nextShortcutPatch,
} from '../app/utils/storyShortcuts'

const root = resolve(import.meta.dirname, '..')

function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

const facets = [
  { id: 'cat-horti', name: 'Hortifruti' },
  { id: 'cat-merc', name: 'Mercearia' },
  { id: 'cat-latic', name: 'Laticínios' },
  { id: 'cat-acougue', name: 'Açougue' },
]

describe('atalhos estilo Stories', () => {
  it('lista os atalhos estáticos na ordem pedida', () => {
    expect(STORY_SHORTCUTS.map(s => s.label)).toEqual([
      'Ovos',
      'Café',
      'Leite',
      'Arroz',
      'Feijão',
      'Óleo',
      'Frango',
      'Açougue',
    ])
  })

  it('resolve categoria por nome ignorando acento', () => {
    expect(findCategoryId(facets, 'hortifruti')).toBe('cat-horti')
    expect(findCategoryId(facets, 'Laticinios')).toBe('cat-latic')
    expect(findCategoryId(facets, 'Acougue')).toBe('cat-acougue')
  })

  it('Ovos declara Hortifruti e Mercearia', () => {
    const ovos = STORY_SHORTCUTS.find(s => s.id === 'ovos')!
    expect(ovos.categoryNames).toEqual(['Hortifruti', 'Mercearia'])
  })

  it('Ovos aplica busca e Hortifruti+Mercearia; Açougue só a categoria', () => {
    const ovos = STORY_SHORTCUTS.find(s => s.id === 'ovos')!
    const acougue = STORY_SHORTCUTS.find(s => s.id === 'acougue')!
    const empty = { q: '', category_ids: [] as string[] }

    expect(nextShortcutPatch(ovos, empty, facets)).toEqual({
      q: 'Ovos',
      category_ids: ['cat-horti', 'cat-merc'],
    })
    expect(nextShortcutPatch(acougue, empty, facets)).toEqual({
      q: '',
      category_ids: ['cat-acougue'],
    })
  })

  it('clicar de novo no atalho ativo limpa busca e categoria', () => {
    const ovos = STORY_SHORTCUTS.find(s => s.id === 'ovos')!
    const state = { q: 'Ovos', category_ids: ['cat-merc', 'cat-horti'] }
    expect(isShortcutActive(ovos, state, facets)).toBe(true)
    expect(nextShortcutPatch(ovos, state, facets)).toEqual({
      q: '',
      category_ids: [],
    })
  })

  it('home troca o intro pelos atalhos e usa os filtros atuais', () => {
    const home = source('app/pages/index.vue')
    expect(home).not.toContain('home__intro')
    expect(home).not.toContain('Último preço por produto e supermercado')
    expect(home).toContain('StoryShortcuts')
    expect(home).toContain('nextShortcutPatch')
    expect(home).toContain('filters.patch')
  })

  it('faixa horizontal com scrollbar invisível e imagem circular', () => {
    const comp = source('app/components/offers/StoryShortcuts.vue')
    expect(comp).toContain('overflow-x: auto')
    expect(comp).toContain('overflow-y: hidden')
    expect(comp).toContain('scrollbar-width: none')
    expect(comp).toContain('border-radius: 50%')
    expect(comp).toContain('STORY_SHORTCUTS')
  })

  it('versiona uma imagem estática por atalho', () => {
    for (const item of STORY_SHORTCUTS) {
      const rel = item.image.replace(/^\//, '')
      expect(existsSync(resolve(root, 'public', rel)), item.image).toBe(true)
    }
  })
})
