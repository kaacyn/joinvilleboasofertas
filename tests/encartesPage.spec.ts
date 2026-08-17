import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('encartes públicos', () => {
  it('expõe a página no menu principal', () => {
    const headerMenu = source('app/components/HeaderMenu.vue')

    expect(headerMenu).toContain('to="/encartes"')
    expect(headerMenu).toContain('Encartes')
  })

  it('identifica visualmente um encarte expirado', () => {
    const path = 'app/components/encartes/EncarteCard.vue'
    expect(existsSync(resolve(root, path))).toBe(true)

    const card = source(path)
    expect(card).toContain('v-if="!encarte.promo_active"')
    expect(card).toContain('Expirado')
  })

  it('fecha o lightbox pelas três interações e bloqueia o fundo', () => {
    const path = 'app/components/encartes/EncarteLightbox.vue'
    expect(existsSync(resolve(root, path))).toBe(true)

    const lightbox = source(path)
    expect(lightbox).toContain('@click.self="emit(\'close\')"')
    expect(lightbox).toContain('aria-label="Fechar"')
    expect(lightbox).toMatch(/if \(e\.key === 'Escape'\) \{\n\s*emit\('close'\)/)
    expect(lightbox).toContain('document.body.style.overflow = \'hidden\'')
    expect(lightbox).toContain('document.body.style.overflow = previousOverflow')
  })

  it('prende o foco no lightbox e devolve ao elemento de origem', () => {
    const lightbox = source('app/components/encartes/EncarteLightbox.vue')

    expect(lightbox).toContain('previouslyFocused = document.activeElement')
    expect(lightbox).toContain('previouslyFocused?.focus()')
    expect(lightbox).toContain('if (e.key === \'Tab\') trapTab(e)')
    expect(lightbox).toContain('e.shiftKey')
    expect(lightbox).toContain('e.preventDefault()')
  })

  it('avisa quando a lista de lojas falha sem bloquear os encartes', () => {
    const page = source('app/pages/encartes.vue')

    expect(page).toContain('storesLoadError')
    expect(page).toContain('Não foi possível carregar as lojas.')

    const gridOpenTag = /<div[^>]*class="grid"[^>]*>/.exec(page)?.[0] ?? ''
    expect(gridOpenTag).toContain('v-if="items.length"')
    expect(gridOpenTag).not.toContain('stores')
  })

  it('carrega o filtro da rota autocontida de lojas com encartes', () => {
    const page = source('app/pages/encartes.vue')

    expect(page).toContain("jboGet<{ items: Store[] }>('/encartes/stores')")
    expect(page).not.toContain("jboGet<{ items: Store[] }>('/establishments')")
  })

  it('envia o limite público padronizado ao feed', () => {
    const page = source('app/pages/encartes.vue')

    expect(page).toContain('limit: 20')
    expect(page).not.toContain('page_size:')
  })
})
