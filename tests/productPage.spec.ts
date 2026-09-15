import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { JboOffer } from '../app/utils/jboApi'
import {
  isOfferExpired,
  otherStoreOffers,
  relatedStoreOffers,
  storeAddressLines,
} from '../app/utils/productPageLists'

const root = resolve(import.meta.dirname, '..')

function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

function offer(partial: Partial<JboOffer> & Pick<JboOffer, 'id'>): JboOffer {
  return {
    product_id: 'prod-1',
    product_name: 'Queijo',
    product_slug: 'queijo',
    establishment_id: 'loja-a',
    establishment_name: 'Mercado A',
    establishment_slug: 'mercado-a',
    price: '10',
    recorded_at: '2026-08-18T00:00:00Z',
    promo_ends_on: '2026-08-25',
    promo_active: true,
    ...partial,
  }
}

describe('página de produto a partir do card da home', () => {
  it('leva o box inteiro para o produto daquela loja, sem link de loja no card', () => {
    const card = source('app/components/offers/OfferCard.vue')

    expect(card).toContain('productHref')
    expect(card).toContain('productOfferPath(props.offer)')
    expect(card).not.toContain('`/loja/${offer.establishment_slug}`')
    expect(card).not.toContain('`/oferta/${offer.id}`')
  })

  it('mostra trilha Início, categoria, mercado e produto atual', () => {
    const page = source('app/pages/produto/[slug]/[[loja]].vue')
    const crumb = source('app/components/AppBreadcrumb.vue')

    expect(page).toContain('AppBreadcrumb')
    expect(page).toContain('siteTrail')
    expect(page).toContain('`/categoria/${category.slug}`')
    expect(page).toContain('`/loja/${store.establishment_slug}`')
    expect(crumb).toContain('aria-label="Trilha"')
    expect(crumb).toContain('aria-current="page"')
    expect(crumb).not.toContain('text-transform: uppercase')
    for (const file of [
      'app/pages/categoria/[slug].vue',
      'app/pages/loja/[slug].vue',
      'app/pages/lojas.vue',
      'app/pages/encartes.vue',
      'app/pages/encarte/[id].vue',
      'app/pages/envie-um-encarte.vue',
      'app/pages/perguntas-frequentes.vue',
      'app/pages/privacidade.vue',
      'app/pages/termos.vue',
      'app/pages/index.vue',
    ]) {
      expect(source(file), file).toContain('AppBreadcrumb')
      expect(source(file), file).toContain('siteTrail')
    }
  })

  it('barra de ações fica acima do título, sem o compartilhar antigo', () => {
    const page = source('app/pages/produto/[slug]/[[loja]].vue')
    expect(page).toContain('<ProductActionsBar')
    expect(page.indexOf('<ProductActionsBar')).toBeLessThan(page.indexOf('<h1>'))
    expect(page).toContain(':offer="selected"')
    expect(page).toContain(':offers="data.offers"')
    expect(page).toContain(':share-path="sharePath"')
    expect(page).not.toContain('data-test="product-share"')
    expect(page).not.toContain('class="heading"')
    expect(page).not.toContain('shareEncarte')
  })

  it('mostra o recorte do encarte e abre o encarte completo', () => {
    const page = source('app/pages/produto/[slug]/[[loja]].vue')

    expect(page).toContain('selected.image_url')
    expect(page).toContain('Verifique todas as condições no encarte')
    expect(page).toContain('Ver no encarte')
    expect(page).toContain('openFullEncarte')
    expect(page).toContain('EncarteLightbox')
    expect(page).toContain(':highlight="selected?.encarte_bbox || null"')
    expect(page).toContain('`/encartes/${encarteId}`')
  })

  it('mostra base do preço, clube com regular riscado e chips de condição', () => {
    const page = source('app/pages/produto/[slug]/[[loja]].vue')
    expect(page).toContain('priceParts(selected).prefix')
    expect(page).toContain('priceParts(selected).each')
    expect(page).toContain('priceParts(selected).regular')
    expect(page).toContain('price-box__club')
    expect(page).toContain('hero__chips')
    expect(page).toContain('offerChips')
    expect(page).toContain('offerTitle')
    expect(page).toContain('offerMainPrice')
  })

  it('expõe o link institucional da loja só no hero e o exclusivo em Onde encontrar', () => {
    const page = source('app/pages/produto/[slug]/[[loja]].vue')
    const box = source('app/components/offers/ProductStoreBox.vue')

    expect(page).toContain('ProductStoreBox')
    expect(page).toContain(':offer="selected"')
    expect(box).toContain('`/loja/${props.offer.establishment_slug}`')
    expect(page).toContain('productOfferPath(offer)')
    expect(page).toContain('productOfferPath(data.value.cheapest)')
    expect(page).not.toContain('`/loja/${offer.establishment_slug}`')
  })

  it('omite a loja atual de Onde encontrar e some a seção se não houver outra', () => {
    const current = offer({ id: '1', establishment_id: 'loja-a' })
    const other = offer({ id: '2', establishment_id: 'loja-b', establishment_name: 'Mercado B' })

    expect(otherStoreOffers([current, other], 'loja-a').map(o => o.id)).toEqual(['2'])
    expect(otherStoreOffers([current], 'loja-a')).toEqual([])
    expect(otherStoreOffers(
      [
        current,
        offer({ id: 'exp', establishment_id: 'loja-b', promo_ends_on: '2000-01-01' }),
        offer({ id: 'ok', establishment_id: 'loja-c', promo_ends_on: '2099-12-31' }),
        offer({ id: 'nodate', establishment_id: 'loja-d', promo_ends_on: null }),
      ],
      'loja-a',
    ).map(o => o.id)).toEqual(['ok', 'exp'])

    const manyStores = Array.from({ length: 7 }, (_, i) =>
      offer({ id: `s${i}`, establishment_id: `loja-${i}`, promo_ends_on: '2099-12-31' }),
    )
    expect(otherStoreOffers([current, ...manyStores], 'loja-a')).toHaveLength(5)

    const page = source('app/pages/produto/[slug]/[[loja]].vue')
    expect(page).toContain('Onde encontrar mais {{ productTitle }}')
    expect(page).toContain('v-if="otherStores.length"')
    expect(page).toContain('otherStoreOffers')
    expect(page).not.toContain('v-for="offer in data.offers"')
  })

  it('marca oferta expirada com tarja EXPIRADO em Onde encontrar', () => {
    expect(isOfferExpired(offer({ id: '1', promo_ends_on: '2000-01-01' }))).toBe(true)
    expect(isOfferExpired(offer({ id: '2', promo_ends_on: '2099-12-31' }))).toBe(false)
    expect(isOfferExpired(offer({
      id: '3',
      promo_starts_on: '2099-01-01',
      promo_ends_on: '2099-12-31',
    }))).toBe(false)

    const page = source('app/pages/produto/[slug]/[[loja]].vue')
    expect(page).toContain('isOfferExpired(offer)')
    expect(page).toContain('EXPIRADO')
    expect(page).toContain('EM BREVE')
    expect(page).toContain('row__stripe')
  })

  it('lista outros produtos da loja, priorizando a mesma categoria', () => {
    const same = offer({ id: '1', product_id: 'prod-1', category_name: 'Frios' })
    const otherCat = offer({
      id: '2', product_id: 'prod-2', product_name: 'Arroz', category_name: 'Mercearia',
    })
    const sameCat = offer({
      id: '3', product_id: 'prod-3', product_name: 'Presunto', category_name: 'Frios',
    })
    const extras = Array.from({ length: 9 }, (_, i) =>
      offer({ id: `x${i}`, product_id: `p${i}` }),
    )

    expect(relatedStoreOffers([same, otherCat], 'prod-1').map(o => o.id)).toEqual(['2'])
    expect(relatedStoreOffers(
      [same, otherCat, sameCat], 'prod-1', 5, 'Frios',
    ).map(o => o.id)).toEqual(['3', '2'])
    expect(relatedStoreOffers(extras, 'prod-1', 5)).toHaveLength(5)
    expect(relatedStoreOffers(
      [
        offer({ id: 'exp', product_id: 'p-exp', category_name: 'Frios', promo_ends_on: '2000-01-01' }),
        offer({ id: 'ok', product_id: 'p-ok', category_name: 'Mercearia', promo_ends_on: '2099-12-31' }),
        offer({ id: 'nodate', product_id: 'p-nd', promo_ends_on: null }),
      ],
      'prod-1',
      5,
      'Frios',
    ).map(o => o.id)).toEqual(['ok', 'exp'])

    const page = source('app/pages/produto/[slug]/[[loja]].vue')
    expect(page).toContain('Outros produtos de')
    expect(page).not.toContain('section-heading--store')
    expect(page).not.toContain('section-heading__logo')
    expect(page).toContain('hide-store')
    expect(page).toContain('OfferCard')
    expect(page).toContain('relatedStoreOffers')
    expect(page).toMatch(/relatedStoreOffers\(\s*[\s\S]*?\b5\b/)
    expect(page).toContain('Veja todos os produtos do supermercado')
    expect(page).toContain('related__all')
    expect(page).toContain('`/loja/${selected.establishment_slug}`')
    expect(page).toContain('establishment_ids')
    expect(page).not.toContain('category_ids')
    expect(page).toContain('v-if="related.length"')
    expect(page).toContain('text-transform: uppercase')

    const card = source('app/components/offers/OfferCard.vue')
    expect(card).toContain('hideStore')
    expect(card).toContain('v-if="!hideStore"')
  })

  it('mostra o mercado atual num box com sino, endereço e expansão', () => {
    expect(storeAddressLines(offer({
      id: '1',
      establishment_addresses: ['Rua A', 'Rua B'],
    }))).toEqual(['Rua A', 'Rua B'])
    expect(storeAddressLines(offer({ id: '2', establishment_address: 'Rua C' }))).toEqual(['Rua C'])
    expect(storeAddressLines(offer({ id: '3' }))).toEqual([])

    const page = source('app/pages/produto/[slug]/[[loja]].vue')
    expect(page).toContain('ProductStoreBox')

    const box = source('app/components/offers/ProductStoreBox.vue')
    expect(box).toContain('StoreFollowBell')
    expect(box).toContain('storeAddressLines')
    expect(box).toContain('ver outros endereços')
    expect(box).toContain('store-box')
    expect(box).toContain('hero__logo--fallback')
    expect(box).toContain('initials(offer.establishment_name)')
  })

  it('mostra logo ou iniciais ao lado do nome do mercado', () => {
    const page = source('app/pages/produto/[slug]/[[loja]].vue')

    expect(page).toContain('offer.establishment_logo_url')
    expect(page).toContain('row__logo--fallback')
    expect(page).toContain('initials(offer.establishment_name)')
  })

  it('redireciona oferta antiga para o produto daquela loja', () => {
    const page = source('app/pages/oferta/[id].vue')
    expect(page).toContain('navigateTo')
    expect(page).toContain('productOfferPath(offer.value)')
  })

  it('monta URL exclusiva com slug do mercado', () => {
    expect(existsSync(resolve(root, 'app/utils/jboApi.ts'))).toBe(true)
    const api = source('app/utils/jboApi.ts')
    expect(api).toContain('encarte_id')
    expect(api).toContain('export function productOfferPath')
    expect(api).toContain('/produto/${product}/${offer.establishment_slug}')
  })

  it('mostra base do preço, unitário, clube e chips no card', () => {
    const card = source('app/components/offers/OfferCard.vue')
    expect(card).toContain('formatOfferPriceParts')
    expect(card).toContain('formatUnitPrice')
    expect(card).toContain('deal__price-unit')
    expect(card).toContain('deal__price-vol')
    expect(card).toContain('deal__price-prefix')
    expect(card).toContain('deal__price-each')
    expect(card).toContain('deal__price-regular')
    expect(card).toContain('deal__chips')
    expect(card).toContain('offerChips')
    expect(card).not.toContain('pricing_mode')
    expect(card).not.toContain('price_volume_min')
  })

  it('mostra volume e unitário no hero e em Onde encontrar', () => {
    const page = source('app/pages/produto/[slug]/[[loja]].vue')
    expect(page).toContain('price-box')
    expect(page).toContain('formatOfferPriceParts')
    expect(page).toContain('formatUnitPrice')
    expect(page).toContain('hero__price-unit')
    expect(page).toContain('hero__price-vol')
    expect(page).toContain('row__price-unit')
    expect(page).toContain('row__price-vol')
  })
})
