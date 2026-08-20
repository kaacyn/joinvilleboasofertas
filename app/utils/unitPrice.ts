/** Formata preço normalizado e sufixo de embalagem (padrão Snap / e-commerce). */

const BRL_2 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const BRL_4 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

const QTY = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 3,
})

const UNIT_DISPLAY: Record<string, string> = {
  ml: 'ml',
  l: 'L',
  g: 'g',
  kg: 'kg',
  un: 'un',
  bdj: 'bdj',
  m: 'm',
}

/**
 * Sufixo de embalagem (ex.: 330ml, 1,35L, un).
 */
export function formatVolumeSuffix(
  volumeValue: string | number | null | undefined,
  volumeUnit: string | null | undefined,
): string | null {
  const unit = String(volumeUnit || '').trim().toLowerCase()
  const label = UNIT_DISPLAY[unit]
  if (!label) return null
  const n = Number(volumeValue)
  if (!Number.isFinite(n) || n <= 0) return null
  if ((unit === 'un' || unit === 'bdj') && n === 1) return label
  return `${QTY.format(n)}${label}`
}

/**
 * Preço por base de comparação (ex.: R$ 1,09/100ml, R$ 2,50/un).
 */
export function formatUnitPrice({
  priceVolumeMin,
  volumeUnitMin,
  comparisonBase,
}: {
  priceVolumeMin?: string | number | null
  volumeUnitMin?: string | null
  comparisonBase?: number | null
} = {}): string | null {
  if (priceVolumeMin == null || !volumeUnitMin || !comparisonBase) return null
  const value = Number(priceVolumeMin)
  if (!Number.isFinite(value) || value <= 0) return null
  const base = Number(comparisonBase)
  if (!Number.isFinite(base) || base <= 0) return null
  const baseLabel = base === 1 ? '' : String(base)
  const formatter = volumeUnitMin === 'm' ? BRL_4 : BRL_2
  return `${formatter.format(value)}/${baseLabel}${volumeUnitMin}`
}

/**
 * Preço da oferta com sufixo de volume quando disponível (texto único).
 */
export function formatOfferPrice(offer: {
  price: string | number
  volume_value?: string | number | null
  volume_unit?: string | null
}): string {
  const { amount, volumeSuffix } = formatOfferPriceParts(offer)
  return volumeSuffix ? `${amount}/${volumeSuffix}` : amount
}

/**
 * Partes do preço para estilizar o volume menor que o valor.
 */
export function formatOfferPriceParts(offer: {
  price: string | number
  volume_value?: string | number | null
  volume_unit?: string | null
}): { amount: string, volumeSuffix: string | null } {
  return {
    amount: BRL_2.format(Number(offer.price)),
    volumeSuffix: formatVolumeSuffix(offer.volume_value, offer.volume_unit),
  }
}
