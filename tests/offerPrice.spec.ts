import { describe, expect, it } from 'vitest'
import {
  formatLotEach,
  formatMoney,
  formatOfferPrice,
  formatOfferPriceParts,
  formatOfferSubtitle,
  formatUnitPrice,
  offerChips,
  offerMainPrice,
  shortAddress,
} from '../app/utils/offerPrice'
import { clubBadgeLabel, hasClubPrice } from '../app/utils/jboApi'

const nbsp = ' '

describe('offerMainPrice', () => {
  it('prefere o preço de clube quando existe', () => {
    expect(offerMainPrice({ price: '12.00', club_price: '9.99' })).toEqual({ value: 9.99, isClub: true })
  })

  it('usa o regular quando não há clube', () => {
    expect(offerMainPrice({ price: '12.00', club_price: null })).toEqual({ value: 12, isClub: false })
  })

  it('retorna null sem preço', () => {
    expect(offerMainPrice({ price: null, club_price: null })).toBeNull()
  })
})

describe('formatOfferPriceParts', () => {
  it('unidade: só o valor', () => {
    expect(formatOfferPriceParts({ price: '3.59', pricing: { basis: 'unit' } })).toEqual({
      prefix: null,
      amount: `R$${nbsp}3,59`,
      suffix: null,
      each: null,
      isClub: false,
      regular: null,
    })
  })

  it('lote: "2 por" com preço de cada', () => {
    const parts = formatOfferPriceParts({ price: '10.00', pricing: { basis: 'lot', lot_quantity: 2 } })
    expect(parts.prefix).toBe('2 por')
    expect(parts.amount).toBe(`R$${nbsp}10,00`)
    expect(parts.each).toBe(`R$${nbsp}5,00 cada`)
    expect(formatOfferPrice({ price: '10.00', pricing: { basis: 'lot', lot_quantity: 2 } })).toBe(`2 por R$${nbsp}10,00`)
    expect(formatLotEach({ price: '10.00', pricing: { basis: 'lot', lot_quantity: 2 } })).toBe(`R$${nbsp}5,00 cada`)
  })

  it('fração por kg vira /kg', () => {
    expect(formatOfferPrice({
      price: '39.90',
      pricing: { basis: 'per_fraction', reference: { value: 1, unit: 'kg' } },
    })).toBe(`R$${nbsp}39,90/kg`)
  })

  it('fração a cada 100 g', () => {
    expect(formatOfferPrice({
      price: '3.99',
      pricing: { basis: 'per_fraction', reference: { value: '100', unit: 'g' } },
    })).toBe(`R$${nbsp}3,99 a cada 100 g`)
  })

  it('clube em destaque com regular ao lado', () => {
    const parts = formatOfferPriceParts({ price: '12.00', club_price: '9.99', pricing: { basis: 'unit' } })
    expect(parts.amount).toBe(`R$${nbsp}9,99`)
    expect(parts.isClub).toBe(true)
    expect(parts.regular).toBe(`R$${nbsp}12,00`)
  })

  it('sem pricing assume unidade', () => {
    expect(formatOfferPrice({ price: '3.59' })).toBe(`R$${nbsp}3,59`)
  })

  it('sem preço mostra travessão', () => {
    expect(formatOfferPriceParts({ price: null, club_price: null }).amount).toBe('—')
  })
})

describe('formatUnitPrice', () => {
  it('formata a base vinda da API', () => {
    expect(formatUnitPrice({ unit_price: '0.5000', unit_price_base: '100 g' })).toBe(`R$${nbsp}0,50/100 g`)
    expect(formatUnitPrice({ unit_price: '2.5', unit_price_base: 'un' })).toBe(`R$${nbsp}2,50/un`)
  })

  it('usa 4 casas quando o valor some em 2', () => {
    expect(formatUnitPrice({ unit_price: '0.0042', unit_price_base: 'ml' })).toBe(`R$${nbsp}0,0042/ml`)
  })

  it('retorna null incompleto', () => {
    expect(formatUnitPrice({ unit_price: null, unit_price_base: '' })).toBeNull()
    expect(formatUnitPrice({ unit_price: '1', unit_price_base: '' })).toBeNull()
  })
})

describe('formatMoney / subtitle / chips', () => {
  it('formatMoney vazio sem valor', () => {
    expect(formatMoney(null)).toBe('')
    expect(formatMoney('4.5')).toBe(`R$${nbsp}4,50`)
  })

  it('subtítulo junta marca e embalagem', () => {
    expect(formatOfferSubtitle({ brand: 'Tio João', quantity_label: '5 kg' })).toBe('Tio João · 5 kg')
    expect(formatOfferSubtitle({ brand: '', quantity_label: '' })).toBe('')
  })

  it('chips: promoção e restrição de loja', () => {
    expect(offerChips({
      promotion: 'Leve 3 pague 2',
      offer_addresses: ['Rua XV, 100 - Centro'],
      establishment_addresses: ['Rua XV, 100 - Centro', 'Rua B, 2 - Itaum'],
    })).toEqual([
      { key: 'promotion', label: 'Leve 3 pague 2' },
      { key: 'addresses', label: 'Só em Centro', title: 'Rua XV, 100 - Centro' },
    ])
  })

  it('chips: sem restrição quando vale em todas as lojas', () => {
    expect(offerChips({
      promotion: '',
      offer_addresses: ['A', 'B'],
      establishment_addresses: ['A', 'B'],
    })).toEqual([])
  })

  it('chips: várias lojas restritas', () => {
    expect(offerChips({
      offer_addresses: ['A', 'B'],
      establishment_addresses: ['A', 'B', 'C'],
    })[0].label).toBe('Só em 2 lojas')
  })

  it('shortAddress encurta pelo bairro ou vírgula', () => {
    expect(shortAddress('Rua XV de Novembro, 100 - Centro')).toBe('Centro')
    expect(shortAddress('Rua XV de Novembro, 100')).toBe('Rua XV de Novembro')
    expect(shortAddress('')).toBe('')
  })
})

describe('clube', () => {
  it('hasClubPrice reconhece club_price e is_club_price', () => {
    expect(hasClubPrice({ club_price: '9.99' })).toBe(true)
    expect(hasClubPrice({ is_club_price: true })).toBe(true)
    expect(hasClubPrice({ price: '1' })).toBe(false)
  })

  it('badge usa o programa do mercado quando há club_price', () => {
    expect(clubBadgeLabel({ club_price: '9.99', establishment_loyalty_program_name: 'Cooperado' })).toBe('Cooperado')
  })
})
