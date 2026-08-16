import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('integração de navegação e filtros', () => {
  it('monta o HeaderMenu no AppHeader e mantém suas rotas disponíveis', () => {
    const appHeader = source('app/components/AppHeader.vue')
    const headerMenu = source('app/components/HeaderMenu.vue')

    expect(appHeader).toMatch(/<HeaderMenu\s*\/>/)
    expect(headerMenu).toContain('to="/lojas"')
    expect(headerMenu).toContain('to="/privacidade"')
    expect(headerMenu).toContain('to="/termos"')
    expect(() => source('app/pages/termos.vue')).not.toThrow()
  })

  it('fornece ao FilterBar as props e listeners do contrato atual', () => {
    const home = source('app/pages/index.vue')

    expect(home).toContain(':facets="facets"')
    expect(home).toContain(':category-ids="filters.state.value.category_ids"')
    expect(home).toContain(':establishment-ids="filters.state.value.establishment_ids"')
    expect(home).toContain('@apply-categories="onApplyCategories"')
    expect(home).toContain('@apply-establishments="onApplyEstablishments"')
    expect(home).not.toContain('@open-sheet=')
  })
})
