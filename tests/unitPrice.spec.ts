import { describe, expect, it } from 'vitest'
import {
  formatOfferPrice,
  formatUnitPrice,
  formatVolumeSuffix,
} from '../app/utils/unitPrice'

const nbsp = '\u00a0'

describe('formatVolumeSuffix', () => {
  it('formata ml sem espaço', () => {
    expect(formatVolumeSuffix(330, 'ml')).toBe('330ml')
  })

  it('formata litros com L maiúsculo e vírgula pt-BR', () => {
    expect(formatVolumeSuffix(1.35, 'l')).toBe('1,35L')
  })

  it('formata kg e g', () => {
    expect(formatVolumeSuffix(1, 'kg')).toBe('1kg')
    expect(formatVolumeSuffix(500, 'g')).toBe('500g')
  })

  it('un com value 1 vira un', () => {
    expect(formatVolumeSuffix(1, 'un')).toBe('un')
  })

  it('un com value >1 inclui o número', () => {
    expect(formatVolumeSuffix(12, 'un')).toBe('12un')
  })

  it('bdj e m', () => {
    expect(formatVolumeSuffix(1, 'bdj')).toBe('bdj')
    expect(formatVolumeSuffix(30, 'm')).toBe('30m')
  })

  it('retorna null sem dados válidos', () => {
    expect(formatVolumeSuffix(null, 'ml')).toBeNull()
    expect(formatVolumeSuffix(330, '')).toBeNull()
    expect(formatVolumeSuffix(0, 'ml')).toBeNull()
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

  it('formata R$/un quando base=1', () => {
    expect(formatUnitPrice({
      priceVolumeMin: '2.4992',
      volumeUnitMin: 'un',
      comparisonBase: 1,
    })).toBe(`R$${nbsp}2,50/un`)
  })

  it('usa 4 casas para metro', () => {
    expect(formatUnitPrice({
      priceVolumeMin: '0.0667',
      volumeUnitMin: 'm',
      comparisonBase: 1,
    })).toBe(`R$${nbsp}0,0667/m`)
  })

  it('retorna null incompleto', () => {
    expect(formatUnitPrice({ priceVolumeMin: '1', volumeUnitMin: 'ml' })).toBeNull()
    expect(formatUnitPrice({})).toBeNull()
  })
})

describe('formatOfferPrice', () => {
  it('anexa sufixo de volume', () => {
    expect(formatOfferPrice({
      price: '3.59',
      volume_value: 330,
      volume_unit: 'ml',
    })).toBe(`R$${nbsp}3,59/330ml`)
  })

  it('sem volume fica só o preço', () => {
    expect(formatOfferPrice({ price: '3.59' })).toBe(`R$${nbsp}3,59`)
  })
})
