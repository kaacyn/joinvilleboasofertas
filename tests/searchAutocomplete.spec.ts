import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { effectScope } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAutocomplete } from '../app/composables/useAutocomplete'

const root = resolve(import.meta.dirname, '..')

function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('busca com autocomplete', () => {
  it('SearchBar usa sugestões públicas de produto (estilo Snap)', () => {
    const bar = source('app/components/offers/SearchBar.vue')
    expect(bar).toContain('SearchAutocomplete')
    expect(bar).toContain('fetchProductSuggestions')
    expect(bar).toContain('@select="onSelect"')

    const api = source('app/utils/jboApi.ts')
    expect(api).toContain('/products/suggest')
    expect(api).toContain('fetchProductSuggestions')

    const ac = source('app/components/offers/SearchAutocomplete.vue')
    expect(ac).toContain('role="combobox"')
    expect(ac).toContain('useAutocomplete')
    expect(ac).toContain('setQuery(v, { fetch: false })')
  })

  describe('setQuery sem fetch (atalhos Stories)', () => {
    let dispose: (() => void) | undefined

    afterEach(() => {
      dispose?.()
      dispose = undefined
    })

    it('sincroniza o texto sem abrir o painel nem chamar o fetcher', async () => {
      const fetcher = vi.fn(async () => [{ id: '1', name: 'Café' }])
      const scope = effectScope()
      const ac = scope.run(() => useAutocomplete({
        fetcher,
        minChars: 1,
        debounceMs: 10,
      }))!
      dispose = () => scope.stop()

      ac.setQuery('Café', { fetch: false })
      await new Promise(r => setTimeout(r, 30))

      expect(ac.query.value).toBe('Café')
      expect(ac.open.value).toBe(false)
      expect(ac.items.value).toEqual([])
      expect(fetcher).not.toHaveBeenCalled()
    })

    it('com fetch padrão ainda abre o painel ao digitar', async () => {
      const fetcher = vi.fn(async () => [{ id: '1', name: 'Café' }])
      const scope = effectScope()
      const ac = scope.run(() => useAutocomplete({
        fetcher,
        minChars: 1,
        debounceMs: 10,
      }))!
      dispose = () => scope.stop()

      ac.setQuery('Café')
      await new Promise(r => setTimeout(r, 30))

      expect(ac.open.value).toBe(true)
      expect(fetcher).toHaveBeenCalledOnce()
    })
  })
})
