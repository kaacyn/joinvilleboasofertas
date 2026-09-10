/** Formatação do preço da oferta a partir da base de venda (unidade, lote, fração) e do clube. */

import type { JboOffer } from '~/utils/jboApi'

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

const QTY = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })

const UNIT_DISPLAY: Record<string, string> = {
  ml: 'ml',
  l: 'L',
  g: 'g',
  kg: 'kg',
  un: 'un',
}

type PriceSource = Pick<JboOffer, 'price' | 'club_price'>
type PricingSource = Pick<JboOffer, 'price' | 'club_price' | 'pricing'>

export type OfferPriceParts = {
  /** "2 por" nas ofertas em lote. */
  prefix: string | null
  /** Valor principal formatado (clube quando existe, senão regular). */
  amount: string
  /** "/kg" ou " a cada 100 g" nas ofertas por fração. */
  suffix: string | null
  /** "R$ 5,00 cada" nas ofertas em lote. */
  each: string | null
  /** True quando o valor principal é o preço de clube. */
  isClub: boolean
  /** Preço regular formatado quando também há preço de clube. */
  regular: string | null
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** Rótulo da unidade de medida (L maiúsculo, demais como vêm). */
export function unitLabel(unit: string | null | undefined): string {
  const key = String(unit || '').trim().toLowerCase()
  return UNIT_DISPLAY[key] || key
}

/** Formata valor em BRL com 2 casas; vazio quando ausente. */
export function formatMoney(value: string | number | null | undefined): string {
  const n = toNumber(value)
  return n == null ? '' : BRL_2.format(n)
}

/**
 * Preço principal da oferta: o de clube quando existe (é o que o cliente paga
 * com o cartão do mercado), senão o regular.
 */
export function offerMainPrice(offer: PriceSource): { value: number, isClub: boolean } | null {
  const club = toNumber(offer.club_price)
  if (club != null) return { value: club, isClub: true }
  const regular = toNumber(offer.price)
  if (regular != null) return { value: regular, isClub: false }
  return null
}

/** Preço regular quando a oferta também tem preço de clube (para riscar ao lado). */
export function offerRegularPrice(offer: PriceSource): number | null {
  const club = toNumber(offer.club_price)
  const regular = toNumber(offer.price)
  if (club == null || regular == null || regular <= club) return null
  return regular
}

/**
 * Partes do preço para tipografia: prefixo de lote, valor, sufixo de fração,
 * "cada" e regular riscado.
 */
export function formatOfferPriceParts(offer: PricingSource): OfferPriceParts {
  const main = offerMainPrice(offer)
  const regular = offerRegularPrice(offer)
  const parts: OfferPriceParts = {
    prefix: null,
    amount: main ? BRL_2.format(main.value) : '—',
    suffix: null,
    each: null,
    isClub: Boolean(main?.isClub),
    regular: regular != null ? BRL_2.format(regular) : null,
  }
  if (!main) return parts

  const pricing = offer.pricing || null
  const basis = String(pricing?.basis || 'unit')
  if (basis === 'lot') {
    const lot = Number(pricing?.lot_quantity)
    if (Number.isFinite(lot) && lot > 1) {
      parts.prefix = `${lot} por`
      parts.each = `${BRL_2.format(main.value / lot)} cada`
    }
    return parts
  }
  if (basis === 'per_fraction') {
    const reference = pricing?.reference
    const unit = unitLabel(reference?.unit)
    if (!unit) return parts
    const value = toNumber(reference?.value) ?? 1
    parts.suffix = value === 1 ? `/${unit}` : ` a cada ${QTY.format(value)} ${unit}`
  }
  return parts
}

/** Preço da oferta em texto único: "2 por R$ 10,00", "R$ 39,90/kg", "R$ 9,99". */
export function formatOfferPrice(offer: PricingSource): string {
  const parts = formatOfferPriceParts(offer)
  const prefix = parts.prefix ? `${parts.prefix} ` : ''
  return `${prefix}${parts.amount}${parts.suffix || ''}`
}

/** "R$ 5,00 cada" nas ofertas em lote; null nas demais. */
export function formatLotEach(offer: PricingSource): string | null {
  return formatOfferPriceParts(offer).each
}

/**
 * Preço por base de comparação vindo da API (ex.: R$ 0,50/100 g, R$ 2,50/un).
 */
export function formatUnitPrice(offer: Pick<JboOffer, 'unit_price' | 'unit_price_base'>): string | null {
  const value = toNumber(offer.unit_price)
  const base = String(offer.unit_price_base || '').trim()
  if (value == null || value <= 0 || !base) return null
  const formatter = Math.round(value * 100) === 0 ? BRL_4 : BRL_2
  return `${formatter.format(value)}/${base}`
}

/** Linha secundária do card: "marca · embalagem". */
export function formatOfferSubtitle(offer: Pick<JboOffer, 'brand' | 'quantity_label'>): string {
  return [offer.brand, offer.quantity_label]
    .map(part => String(part || '').trim())
    .filter(Boolean)
    .join(' · ')
}

/** Nome curto de um endereço: bairro (após " - ") ou trecho antes da vírgula. */
export function shortAddress(text: string): string {
  const raw = String(text || '').trim()
  if (!raw) return ''
  let short = raw
  if (raw.includes(' - ')) {
    short = raw.split(' - ').pop() || raw
  }
  else if (raw.includes(',')) {
    short = raw.split(',')[0]
  }
  short = short.trim()
  return short.length > 28 ? `${short.slice(0, 27).trimEnd()}…` : short
}

export type OfferChip = {
  key: string
  label: string
  title?: string
}

/**
 * Chips de condição da oferta: promoção literal ("Leve 3 pague 2") e
 * restrição de loja ("Só em Itapoá") quando vale só em parte das filiais.
 */
export function offerChips(
  offer: Pick<JboOffer, 'promotion' | 'offer_addresses' | 'establishment_addresses'>,
): OfferChip[] {
  const chips: OfferChip[] = []
  const promotion = String(offer.promotion || '').trim()
  if (promotion) chips.push({ key: 'promotion', label: promotion })

  const restricted = (offer.offer_addresses || []).map(a => String(a || '').trim()).filter(Boolean)
  const all = (offer.establishment_addresses || []).map(a => String(a || '').trim()).filter(Boolean)
  const isPartial = restricted.length > 0 && (all.length === 0 || restricted.length < all.length)
  if (isPartial) {
    const label = restricted.length === 1
      ? `Só em ${shortAddress(restricted[0])}`
      : `Só em ${restricted.length} lojas`
    chips.push({ key: 'addresses', label, title: restricted.join(' · ') })
  }
  return chips
}
