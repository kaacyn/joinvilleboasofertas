import { describe, expect, it } from 'vitest'
import {
  formatOfferPrice,
  formatOfferPriceParts,
  formatSellUnitSuffix,
  formatUnitPrice,
  formatVolumeSuffix,
} from '../app/utils/unitPrice'

const nbsp = '\u00a0'

describe('formatVolumeSuffix', () => {
  it('formata ml sem espaço', () => {
    expect(formatVolumeSuffix(330, 'ml')).toBe('330ml')
  })

  it('retorna null sem dados válidos', () => {
    expect(formatVolumeSuffix(null, 'ml')).toBeNull()
  })
})

describe('formatSellUnitSuffix', () => {
  it('by_measure → kg', () => {
    expect(formatSellUnitSuffix('by_measure')).toBe('kg')
  })

  it('fixed_package → un', () => {
    expect(formatSellUnitSuffix('fixed_package')).toBe('un')
  })

  it('bandeja → bdj', () => {
    expect(formatSellUnitSuffix('bandeja')).toBe('bdj')
  })

  it('pacote/caixa/fardo → abreviações', () => {
    expect(formatSellUnitSuffix('pacote')).toBe('pct.')
    expect(formatSellUnitSuffix('caixa')).toBe('cx.')
    expect(formatSellUnitSuffix('fardo')).toBe('fd.')
  })

  it('legado fixed_package + bdj → bdj', () => {
    expect(formatSellUnitSuffix('fixed_package', 'bdj')).toBe('bdj')
  })

  it('unknown → null', () => {
    expect(formatSellUnitSuffix('unknown')).toBeNull()
  })
})

describe('formatUnitPrice', () => {
  it('formata R$/100ml', () => {
    expect(formatUnitPrice({
      priceVolumeMin: '1.0879',
      volumeUnitMin: 'ml',
      comparisonBase: 100,
    })).toBe(`R$${nbsp}1,09/100ml`)
  })

  it('retorna null incompleto', () => {
    expect(formatUnitPrice({})).toBeNull()
  })
})

describe('formatOfferPrice', () => {
  it('usa modo de venda, não volume', () => {
    expect(formatOfferPrice({
      price: '3.59',
      pricing_mode: 'fixed_package',
      volume_unit: 'ml',
    })).toBe(`R$${nbsp}3,59/un`)
  })

  it('kg para by_measure', () => {
    expect(formatOfferPrice({
      price: '34.50',
      pricing_mode: 'by_measure',
    })).toBe(`R$${nbsp}34,50/kg`)
  })

  it('bdj para bandeja', () => {
    expect(formatOfferPrice({
      price: '5.50',
      pricing_mode: 'bandeja',
    })).toBe(`R$${nbsp}5,50/bdj`)
  })

  it('sem modo fica só o preço', () => {
    expect(formatOfferPrice({ price: '3.59' })).toBe(`R$${nbsp}3,59`)
  })
})

describe('formatOfferPriceParts', () => {
  it('separa valor e sufixo de venda', () => {
    expect(formatOfferPriceParts({
      price: '3.20',
      pricing_mode: 'fixed_package',
    })).toEqual({
      amount: `R$${nbsp}3,20`,
      volumeSuffix: 'un',
    })
  })
})
