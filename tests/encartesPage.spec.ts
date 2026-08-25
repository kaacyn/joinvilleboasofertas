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

  it('expõe CTA Envie um encarte', () => {
    const page = source('app/pages/encartes.vue')
    expect(page).toContain('to="/envie-um-encarte"')
    expect(page).toContain('Envie um encarte')
  })

  it('distingue encarte expirado de em breve pelas datas', () => {
    const path = 'app/components/encartes/EncarteCard.vue'
    expect(existsSync(resolve(root, path))).toBe(true)

    const card = source(path)
    expect(card).toContain('getPromoPhase')
    expect(card).toContain('formatPromoValidityLabel')
    expect(card).toContain('Expirado')
    expect(card).toContain('Em breve')
    expect(card).not.toContain('encarte.promo_active')

    const detail = source('app/pages/encarte/[id].vue')
    expect(detail).toContain('formatPromoValidityLabel')
    expect(detail).toContain('Em breve')
    expect(detail).not.toContain('encarte.promo_active')
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

  it('usa o filtro de lojas igual ao da home', () => {
    const page = source('app/pages/encartes.vue')

    expect(page).toContain('FilterBar')
    expect(page).toContain(':show-categories="false"')
    expect(page).toContain(':show-sort="true"')
    expect(page).toContain(':sort-options="ENCARTES_SORT_OPTIONS"')
    expect(page).toContain('@apply-establishments="onApplyEstablishments"')
    expect(page).toContain('@update:sort="onSort"')
    expect(page).toContain('establishment_ids:')
    expect(page).toContain('sort,')
    expect(page).not.toContain('filter__select')
    expect(page).toContain("jboGet<{ items: Store[] }>('/encartes/stores')")
  })

  it('ordena por cadastro ou vencimento na URL', () => {
    const page = source('app/pages/encartes.vue')
    const filters = source('app/composables/useEncartesFilters.ts')
    const bar = source('app/components/offers/FilterBar.vue')

    expect(page).toContain('setSort')
    expect(page).toContain('route.query.sort')
    expect(filters).toContain("ENCARTES_SORT_DEFAULT = 'created'")
    expect(filters).toContain("value: 'created'")
    expect(filters).toContain("label: 'Cadastro'")
    expect(filters).toContain("value: 'ends'")
    expect(filters).toContain("label: 'Vencimento'")
    expect(bar).toContain('pickSort')
    expect(bar).toContain('Ordenar:')
    expect(bar).toContain('Ordenar por')
    expect(bar).not.toContain('filterbar__select')
  })

  it('expõe lojas filtradas na URL', () => {
    const page = source('app/pages/encartes.vue')
    const filters = source('app/composables/useEncartesFilters.ts')

    expect(page).toContain('useEncartesFilters')
    expect(page).toContain('setEstablishmentIds')
    expect(page).toContain('route.query.establishment_ids')
    expect(filters).toContain('router.replace')
    expect(filters).toContain('establishment_ids')
  })

  it('envia o limite público padronizado ao feed', () => {
    const page = source('app/pages/encartes.vue')

    expect(page).toContain('limit: 20')
    expect(page).not.toContain('page_size:')
  })

  it('mostra quando cada encarte foi cadastrado', () => {
    const card = source('app/components/encartes/EncarteCard.vue')
    const api = source('app/utils/jboApi.ts')

    expect(card).toContain('formatRegisteredAt(encarte.created_at,')
    expect(card).toContain('class="card__registered"')
    expect(api).toMatch(/created_at:\s*string/)
  })

  it('congela no payload o instante de referência do cadastro', () => {
    const card = source('app/components/encartes/EncarteCard.vue')

    expect(card).toMatch(/useState\('encartes:rendered-at', \(\) => new Date\(\)\.toISOString\(\)\)/)
    expect(card).toContain('formatRegisteredAt(encarte.created_at, new Date(renderedAt))')
  })

  it('mostra a logo da loja ao lado do nome, com iniciais como reserva', () => {
    const card = source('app/components/encartes/EncarteCard.vue')

    expect(card).toContain('v-if="encarte.establishment_logo_url"')
    expect(card).toContain(':src="encarte.establishment_logo_url"')
    expect(card).toContain('class="card__logo"')
    expect(card).toContain('card__logo--fallback')
    expect(card).toContain('initials(encarte.establishment_name)')
    expect(card).toMatch(/\.card__logo[^{]*\{[^}]*object-fit:\s*contain/)
  })

  it('mostra a miniatura inteira no quadro de story, com fundo nas laterais', () => {
    const card = source('app/components/encartes/EncarteCard.vue')

    expect(card).toContain('class="card__fill"')
    expect(card).toContain('class="card__img"')
    expect(card).toMatch(/aspect-ratio:\s*9\s*\/\s*16/)
    expect(card).not.toMatch(/aspect-ratio:\s*3\s*\/\s*4/)
    expect(card).toMatch(/\.card__img[^{]*\{[^}]*object-fit:\s*contain/)
    expect(card).toMatch(/\.card__img[^{]*\{[^}]*position:\s*absolute/)
    expect(card).toMatch(/\.card__fill[^{]*\{[^}]*object-fit:\s*cover/)
    expect(card).toMatch(/\.card__fill[^{]*\{[^}]*filter:\s*blur/)
  })

  it('tem página pública /encarte/[id] com OG e fetch do detalhe', () => {
    const page = source('app/pages/encarte/[id].vue')
    expect(page).toContain("jboGet<JboEncarte>(`/encartes/${")
    expect(page).toContain('image:')
    expect(page).toContain('useJboSeo')
  })

  it('compartilha o encarte na página de detalhe', () => {
    const page = source('app/pages/encarte/[id].vue')
    expect(page).toContain('shareEncarte')
    expect(page).toContain('aria-label="Compartilhar encarte"')
  })

  it('decompõe o card: article com abrir e compartilhar irmãos', () => {
    const card = source('app/components/encartes/EncarteCard.vue')
    expect(card).toMatch(/<article[\s\S]*class="card"/)
    expect(card).not.toMatch(/<button[\s\S]*class="card"/)
    expect(card).toContain('shareEncarte')
    expect(card).toContain('aria-label="Compartilhar encarte"')
  })

  it('tem sino no card como irmão, não filho do botão de abrir', () => {
    const card = source('app/components/encartes/EncarteCard.vue')
    expect(card).toContain('aria-label="Receber avisos desta loja"')
    expect(card).toContain('useJboStoreFollow')
    expect(card).toMatch(/<article[\s\S]*class="card"/)

    const openButtons = card.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) || []
    const openWithBell = openButtons.filter(block =>
      block.includes('card__open') && block.includes('Receber avisos desta loja'),
    )
    expect(openWithBell).toEqual([])
    expect(card).toContain('@click.stop')
  })

  it('SW trata push e notificationclick', () => {
    const sw = source('app/sw.ts')
    expect(sw).toContain("addEventListener('push'")
    expect(sw).toContain("addEventListener('notificationclick'")
    expect(sw).toContain('showNotification')
  })
})
