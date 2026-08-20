/** Formata preço normalizado e sufixo de modo de venda (un/kg/bdj). */

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
 * Sufixo de embalagem (ex.: 330ml) — uso interno/legado; cards usam modo de venda.
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
 * Sufixo do preço conforme tipo de embalagem: un | kg | bdj | pct. | cx. | fd.
 * Legado: fixed_package + volume_unit bdj → bdj.
 */
export function formatSellUnitSuffix(
  pricingMode?: string | null,
  volumeUnit?: string | null,
): string | null {
  const mode = String(pricingMode || '').trim().toLowerCase()
  if (mode === 'by_measure') return 'kg'
  if (mode === 'bandeja') return 'bdj'
  if (mode === 'pacote') return 'pct.'
  if (mode === 'caixa') return 'cx.'
  if (mode === 'fardo') return 'fd.'
  if (mode === 'fixed_package') {
    const unit = String(volumeUnit || '').trim().toLowerCase()
    if (unit === 'bdj') return 'bdj'
    return 'un'
  }
  return null
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
 * Preço da oferta com sufixo de modo de venda (texto único).
 */
export function formatOfferPrice(offer: {
  price: string | number
  pricing_mode?: string | null
  volume_unit?: string | null
}): string {
  const { amount, volumeSuffix } = formatOfferPriceParts(offer)
  return volumeSuffix ? `${amount}/${volumeSuffix}` : amount
}

/**
 * Partes do preço: valor + sufixo de venda (un/kg/bdj) para tipografia.
 */
export function formatOfferPriceParts(offer: {
  price: string | number
  pricing_mode?: string | null
  volume_unit?: string | null
}): { amount: string, volumeSuffix: string | null } {
  return {
    amount: BRL_2.format(Number(offer.price)),
    volumeSuffix: formatSellUnitSuffix(offer.pricing_mode, offer.volume_unit),
  }
}
