import type { JboOffer } from '~/utils/jboApi'
import { isPromoExpired } from '~/utils/promoPhase'

function hasExpiry(offer: JboOffer): boolean {
  return Boolean(offer.promo_ends_on)
}

function activeFirst(offers: JboOffer[]): JboOffer[] {
  const active = offers.filter(offer => !isPromoExpired(offer))
  const expired = offers.filter(offer => isPromoExpired(offer))
  return [...active, ...expired]
}

function preferSameCategory(
  offers: JboOffer[],
  categoryName?: string | null,
): JboOffer[] {
  if (!categoryName) return offers
  const same = offers.filter(offer => offer.category_name === categoryName)
  const rest = offers.filter(offer => offer.category_name !== categoryName)
  return [...same, ...rest]
}

/** Ofertas do mesmo produto em supermercados que não são o da página. */
export function otherStoreOffers(
  offers: JboOffer[],
  establishmentId?: string | null,
  limit = 5,
): JboOffer[] {
  if (!establishmentId) return []
  return activeFirst(
    offers.filter(
      offer => offer.establishment_id !== establishmentId && hasExpiry(offer),
    ),
  ).slice(0, limit)
}

/** Outras ofertas da mesma loja, sem o produto atual. Vigentes primeiro; mesma categoria em seguida. */
export function relatedStoreOffers(
  items: JboOffer[],
  productId?: string | null,
  limit = 5,
  categoryName?: string | null,
): JboOffer[] {
  const others = items.filter(
    offer => offer.product_id !== productId && hasExpiry(offer),
  )
  const active = preferSameCategory(
    others.filter(offer => !isPromoExpired(offer)),
    categoryName,
  )
  const expired = preferSameCategory(
    others.filter(offer => isPromoExpired(offer)),
    categoryName,
  )
  return [...active, ...expired].slice(0, limit)
}

/** Oferta cuja promoção já encerrou. */
export function isOfferExpired(offer: JboOffer): boolean {
  return isPromoExpired(offer)
}

/** Endereços da loja: lista completa, ou o endereço principal. */
export function storeAddressLines(offer: {
  establishment_addresses?: string[] | null
  establishment_address?: string | null
}): string[] {
  const seen: string[] = []
  for (const raw of offer.establishment_addresses || []) {
    const text = String(raw || '').trim()
    if (text && !seen.includes(text)) seen.push(text)
  }
  if (seen.length) return seen
  const one = String(offer.establishment_address || '').trim()
  return one ? [one] : []
}
