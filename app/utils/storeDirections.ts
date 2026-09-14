/** Filial da loja como vem de `/establishments/{slug}`. */
export type StoreBranch = {
  address: string
  lat: number | null
  lng: number | null
  google_place_id: string
  phones: { number: string, is_whatsapp: boolean }[]
}

const CITY = 'Joinville - SC'

function hasCoords(branch: StoreBranch): boolean {
  return typeof branch.lat === 'number' && typeof branch.lng === 'number'
}

/** Texto de busca quando a filial não tem coordenadas: loja + endereço + cidade. */
function searchText(branch: StoreBranch, storeName: string): string {
  const parts = [storeName.trim(), branch.address.trim()].filter(Boolean)
  if (!/joinville/i.test(branch.address)) parts.push(CITY)
  return parts.join(', ')
}

function coords(branch: StoreBranch): string {
  return encodeURIComponent(`${branch.lat},${branch.lng}`)
}

/**
 * Rota no Google Maps (link universal): abre o app de mapas no celular,
 * senão o site. O place_id, quando existe, leva ao estabelecimento certo.
 */
export function googleMapsDirectionsUrl(branch: StoreBranch, storeName: string): string {
  const destination = hasCoords(branch)
    ? coords(branch)
    : encodeURIComponent(searchText(branch, storeName))
  let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`
  if (branch.google_place_id) {
    url += `&destination_place_id=${encodeURIComponent(branch.google_place_id)}`
  }
  return url
}

/** Navegação no Waze até a filial (coordenadas ou busca por texto). */
export function wazeUrl(branch: StoreBranch, storeName: string): string {
  const target = hasCoords(branch)
    ? `ll=${coords(branch)}`
    : `q=${encodeURIComponent(searchText(branch, storeName))}`
  return `https://waze.com/ul?${target}&navigate=yes`
}

/** Número em formato internacional (só dígitos, com 55), ou null para 0800 e afins. */
function internationalDigits(number: string): string | null {
  const digits = number.replace(/\D/g, '')
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits
  if (!digits.startsWith('0') && (digits.length === 10 || digits.length === 11)) return `55${digits}`
  return null
}

/** Link `tel:` que o celular disca direto. */
export function phoneHref(number: string): string | null {
  const international = internationalDigits(number)
  if (international) return `tel:+${international}`
  const digits = number.replace(/\D/g, '')
  return digits ? `tel:${digits}` : null
}

/** Conversa no WhatsApp com a filial. */
export function whatsappUrl(number: string): string | null {
  const international = internationalDigits(number)
  return international ? `https://wa.me/${international}` : null
}

/**
 * Filiais da loja. API sem `addresses` (versão anterior): o endereço
 * principal vira uma filial sem mapa, e a rota cai na busca por texto.
 */
export function storeBranches(est: { address?: string | null, addresses?: StoreBranch[] }): StoreBranch[] {
  if (Array.isArray(est.addresses)) return est.addresses
  const address = (est.address || '').trim()
  if (!address) return []
  return [{ address, lat: null, lng: null, google_place_id: '', phones: [] }]
}

/** Linha abaixo do nome: o endereço (uma filial) ou a contagem (várias). */
export function branchesSummary(branches: StoreBranch[]): string {
  if (!branches.length) return ''
  if (branches.length === 1) return branches[0].address
  return `${branches.length} endereços`
}
