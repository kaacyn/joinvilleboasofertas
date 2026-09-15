import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { offerTitle, suggestionTitle } from '../app/utils/offerTitle'

const root = resolve(import.meta.dirname, '..')

function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('offerTitle', () => {
  it('junta nome, marca e volume no padrão de e-commerce', () => {
    expect(offerTitle({ product_name: 'Óleo de Soja', brand: 'Coamo', quantity_label: '900 ml' }))
      .toBe('Óleo de Soja Coamo 900 ml')
    expect(offerTitle({ product_name: 'Papel Higiênico Folha Tripla', brand: 'Mili', quantity_label: '12 un × 20 un' }))
      .toBe('Papel Higiênico Folha Tripla Mili 12 un × 20 un')
  })

  it('só o nome quando não há marca nem volume (granel, hortifruti)', () => {
    expect(offerTitle({ product_name: 'Alho Granel', brand: '', quantity_label: '' })).toBe('Alho Granel')
    expect(offerTitle({ product_name: 'Cebola' })).toBe('Cebola')
  })

  it('não repete a marca quando o nome já a contém (sem acento e sem caixa)', () => {
    expect(offerTitle({ product_name: 'Arroz Tio Branco', brand: 'Tio Branco', quantity_label: '5 kg' }))
      .toBe('Arroz Tio Branco 5 kg')
    expect(offerTitle({ product_name: 'Refrigerante Coca-Cola', brand: 'coca-cola', quantity_label: '2 L' }))
      .toBe('Refrigerante Coca-Cola 2 L')
    expect(offerTitle({ product_name: 'Açúcar União', brand: 'Uniao' })).toBe('Açúcar União')
  })

  it('compara a marca por palavra inteira, não por trecho', () => {
    expect(offerTitle({ product_name: 'Cerveja Original', brand: 'Origi' })).toBe('Cerveja Original Origi')
  })

  it('não repete o volume quando o nome já o traz (com ou sem espaço)', () => {
    expect(offerTitle({ product_name: 'Cerveja Teste 330ml', brand: 'Teste', quantity_label: '330 ml' }))
      .toBe('Cerveja Teste 330ml')
    expect(offerTitle({ product_name: 'Refrigerante 2 L', brand: 'Cini', quantity_label: '2 L' }))
      .toBe('Refrigerante 2 L Cini')
  })

  it('ignora espaços sobrando e valores nulos', () => {
    expect(offerTitle({ product_name: '  Café ', brand: ' Caboclo ', quantity_label: null as unknown as string }))
      .toBe('Café Caboclo')
    expect(offerTitle({ product_name: '', brand: 'Marca', quantity_label: '1 kg' })).toBe('Marca 1 kg')
  })

  it('suggestionTitle aplica a mesma regra ao item do autocomplete', () => {
    expect(suggestionTitle({ id: '1', name: 'Arroz Parboilizado', brand: 'Tio João', quantity_label: '5 kg' }))
      .toBe('Arroz Parboilizado Tio João 5 kg')
    expect(suggestionTitle({ id: '2', name: 'Arroz' })).toBe('Arroz')
  })
})

describe('título completo em todos os lugares que mostram oferta', () => {
  it('card, tile e hero usam offerTitle no nome e no alt, sem linha secundária duplicada', () => {
    for (const path of [
      'app/components/offers/OfferCard.vue',
      'app/components/offers/OfferTile.vue',
      'app/components/home/HeroSavings.vue',
    ]) {
      const file = source(path)
      expect(file, path).toContain('offerTitle(props.offer)')
      expect(file, path).toContain(':alt="title"')
      expect(file, path).toContain('{{ title }}')
      expect(file, path).not.toContain('offer.product_name')
      expect(file, path).not.toContain('formatOfferSubtitle')
    }
    expect(source('app/components/offers/OfferCard.vue')).not.toContain('deal__subtitle')
  })

  it('página do produto usa o título completo no h1, SEO, share e JSON-LD', () => {
    const page = source('app/pages/produto/[slug]/[[loja]].vue')
    expect(page).toContain('offerTitle({')
    expect(page).toContain('<h1>{{ productTitle }}</h1>')
    expect(page).toContain('Onde encontrar mais {{ productTitle }}')
    expect(page).toContain(':product-title="productTitle"')
    expect(source('app/components/offers/ProductActionsBar.vue')).toContain('title: props.productTitle')
    expect(page).toContain('name: productTitle.value')
    expect(page).not.toContain('data.product.name }}')
    expect(page).not.toContain('formatOfferSubtitle')
    expect(page).not.toContain('hero__subtitle')
  })

  it('hotspots do encarte e autocomplete mostram o título completo', () => {
    expect(source('app/pages/encarte/[id].vue')).toContain('offerTitle(offer)')
    const ac = source('app/components/offers/SearchAutocomplete.vue')
    expect(ac).toContain('suggestionTitle(item)')
    expect(ac).not.toContain('{{ item.name }}')
    const api = source('app/utils/jboApi.ts')
    expect(api).toMatch(/JboSuggestItem = \{[^}]*brand\?: string[^}]*quantity_label\?: string[^}]*\}/)
  })
})
