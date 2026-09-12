/** Título completo da oferta: nome do produto + marca + volume, sem repetir o que o nome já traz. */

import type { JboOffer, JboSuggestItem } from '~/utils/jboApi'

type TitleSource = Pick<JboOffer, 'product_name'> & Partial<Pick<JboOffer, 'brand' | 'quantity_label'>>

/** Colapsa espaços e apara as pontas. */
function clean(text: string | null | undefined): string {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

/** Minúsculas, sem acentos e com pontuação virando espaço, para comparar trechos do título. */
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** True quando o nome já contém a marca como sequência de palavras inteiras. */
function nameHasBrand(name: string, brand: string): boolean {
  return ` ${name} `.includes(` ${brand} `)
}

/** True quando o nome já traz o volume, com ou sem espaço ("330 ml" casa com "330ml"). */
function nameHasQuantity(name: string, quantity: string): boolean {
  return name.replace(/\s+/g, '').includes(quantity.replace(/\s+/g, ''))
}

/**
 * Título no padrão de e-commerce: "Óleo de Soja Coamo 900 ml".
 * Marca e volume só entram quando o nome do produto ainda não os contém.
 */
export function offerTitle(offer: TitleSource): string {
  const name = clean(offer.product_name)
  const brand = clean(offer.brand)
  const quantity = clean(offer.quantity_label)
  const nameNorm = normalizeText(name)
  const parts = [name]
  if (brand && !nameHasBrand(nameNorm, normalizeText(brand))) parts.push(brand)
  if (quantity && !nameHasQuantity(nameNorm, normalizeText(quantity))) parts.push(quantity)
  return parts.filter(Boolean).join(' ')
}

/** Mesma regra para um item do autocomplete (`name` no lugar de `product_name`). */
export function suggestionTitle(item: JboSuggestItem): string {
  return offerTitle({
    product_name: item.name,
    brand: item.brand,
    quantity_label: item.quantity_label,
  })
}
