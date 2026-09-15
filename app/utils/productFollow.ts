/** Sino do produto por mercado: estado, legendas, textos da folha e avisos (puro). */

import type { JboOffer } from '~/utils/jboApi'
import { formatMoney, formatOfferPrice, offerMainPrice } from '~/utils/offerPrice'
import { getPromoPhase } from '~/utils/promoPhase'
import type { FollowInstructionMode } from '~/utils/webPush'

export type ProductFollowScope = 'none' | 'all' | 'stores'
export type ProductFollowState = { scope: ProductFollowScope, establishment_ids: string[] }
export type ProductFollowAction = 'follow_store' | 'follow_all' | 'unfollow_store' | 'unfollow_all'
export type FollowPick = 'here' | 'all'
export type FollowSheetMode = 'choose' | 'manage' | 'ios' | 'denied' | 'unsupported'
export type FollowOptionView = { key: FollowPick, title: string, description: string, active: boolean }
export type FollowOffView = { action: ProductFollowAction, label: string }
export type FollowSheetView = {
  mode: FollowSheetMode
  title: string
  lead: string
  note: string
  options: FollowOptionView[]
  offActions: FollowOffView[]
  footnote: string
}

export const EMPTY_FOLLOW_STATE: ProductFollowState = { scope: 'none', establishment_ids: [] }

/** True quando o aviso vale para o mercado da página (todos ou lista com ele). */
export function followsHere(state: ProductFollowState, pageStoreId: string): boolean {
  if (state.scope === 'all') return true
  return state.scope === 'stores' && state.establishment_ids.includes(pageStoreId)
}

/** Mercados seguidos além do mercado da página. */
export function otherStoreIds(state: ProductFollowState, pageStoreId: string): string[] {
  return state.scope === 'stores'
    ? state.establishment_ids.filter(id => id !== pageStoreId)
    : []
}

/** "A", "A e B", "A, B e C". */
export function joinNames(names: string[]): string {
  if (names.length < 2) return names[0] || ''
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}

/** "no A", "no A e no B", "no A, no B e no C" — une nomes com preposição de localidade. */
function withPreposition(names: string[]): string {
  return joinNames(names.map(name => `no ${name}`))
}

/** "mercado" ou "mercados" conforme a quantidade. */
function markets(count: number): string {
  return count === 1 ? 'mercado' : 'mercados'
}

/**
 * Legenda persistente ao lado do sino; `on` pinta com a cor do sino ligado.
 * Com um único outro mercado de nome conhecido em `offers`, nomeia o mercado.
 */
export function followCaption(
  state: ProductFollowState,
  pageStoreId: string,
  offers: JboOffer[] = [],
): { text: string, on: boolean } {
  if (state.scope === 'all') return { text: 'Avisos em todos os mercados', on: true }
  const otherIds = otherStoreIds(state, pageStoreId)
  const others = otherIds.length
  if (followsHere(state, pageStoreId)) {
    return {
      text: others ? `Avisos aqui e em mais ${others} ${markets(others)}` : 'Avisos neste mercado',
      on: true,
    }
  }
  if (others === 1) {
    const name = offers.find(o => o.establishment_id === otherIds[0])?.establishment_name
    return { text: name ? `Você segue no ${name}` : 'Você segue em outro mercado', on: false }
  }
  if (others > 1) return { text: `Você segue em ${others} outros mercados`, on: false }
  return { text: '', on: false }
}

/** Rótulo acessível (e `title`) do botão do sino. */
export function followBellLabel(state: ProductFollowState, pageStoreId: string): string {
  if (state.scope === 'all') return 'Avisos ativos em todos os mercados. Toque para mudar'
  if (followsHere(state, pageStoreId)) return 'Avisos ativos neste mercado. Toque para mudar'
  return 'Receber avisos deste produto'
}

/** Qual folha abrir: gerenciar (já segue aqui), instruções (iPhone/bloqueado) ou escolha. */
export function followSheetMode(
  state: ProductFollowState,
  pageStoreId: string,
  instructionMode: FollowInstructionMode,
): FollowSheetMode {
  if (followsHere(state, pageStoreId)) return 'manage'
  if (instructionMode === 'ios-install') return 'ios'
  if (instructionMode === 'permission-denied') return 'denied'
  return 'choose'
}

/** "no Supermercado Carolina" quando todos os nomes são conhecidos; senão "em outro mercado". */
function elsewhere(ids: string[], offers: JboOffer[]): string {
  const names = ids
    .map(id => offers.find(o => o.establishment_id === id)?.establishment_name || '')
    .filter(Boolean)
  if (names.length === ids.length) return withPreposition(names)
  return ids.length === 1 ? 'em outro mercado' : `em ${ids.length} outros mercados`
}

/** "Hoje em 3 mercados, a partir de R$ 1,99." com as ofertas vigentes da página. */
export function marketSummary(offers: JboOffer[], now = new Date()): string {
  const storesWithOffer = new Map<string, string>()
  let lowest: number | null = null
  for (const item of offers) {
    if (getPromoPhase(item, now) !== 'active') continue
    storesWithOffer.set(item.establishment_id, item.establishment_name)
    const main = offerMainPrice(item)
    if (main && (lowest == null || main.value < lowest)) lowest = main.value
  }
  if (storesWithOffer.size === 0) return 'Avisamos quando qualquer mercado publicar.'
  if (storesWithOffer.size === 1) {
    const [name] = storesWithOffer.values()
    return `Hoje só o ${name} tem oferta; avisamos quando outro publicar.`
  }
  return `Hoje em ${storesWithOffer.size} mercados, a partir de ${formatMoney(lowest)}.`
}

/**
 * Textos da folha do sino para o estado atual (protótipo aprovado).
 * Quando o modo seria "ios" mas o navegador não é o do iPhone (ex.: navegador
 * embutido no Android), reclassifica para "unsupported" — sem app para instalar.
 */
export function followSheetView(input: {
  state: ProductFollowState
  pageStoreId: string
  pageStoreName: string
  offers: JboOffer[]
  instructionMode: FollowInstructionMode
  isIos: boolean
  now?: Date
}): FollowSheetView {
  const { state, pageStoreId, offers } = input
  const store = input.pageStoreName
  const rawMode = followSheetMode(state, pageStoreId, input.instructionMode)
  const mode = rawMode === 'ios' && !input.isIos ? 'unsupported' : rawMode
  const others = otherStoreIds(state, pageStoreId)
  const empty = { note: '', options: [], offActions: [], footnote: '' }

  if (mode === 'unsupported') {
    return {
      mode,
      title: 'Este navegador não recebe avisos',
      lead: 'Abra esta página no navegador do celular (Chrome, por exemplo) para ativar os avisos.',
      ...empty,
    }
  }
  if (mode === 'ios') {
    return {
      mode,
      title: 'Instale o app para receber avisos',
      lead: 'No iPhone, os avisos chegam pelo app instalado na tela de início.',
      ...empty,
    }
  }
  if (mode === 'denied') {
    return {
      mode,
      title: 'Notificações bloqueadas',
      lead: 'Este navegador está bloqueando os avisos do Joinville Boas Ofertas.',
      ...empty,
    }
  }
  if (mode === 'manage') {
    const all = state.scope === 'all'
    let lead = `Você recebe um aviso quando o ${store} publicar oferta nova ou mudar o preço.`
    if (all) lead = 'Você recebe um aviso quando qualquer mercado publicar oferta nova ou mudar o preço.'
    else if (others.length) {
      const otherNames = others
        .map(id => offers.find(o => o.establishment_id === id)?.establishment_name || '')
        .filter(Boolean)
      if (otherNames.length === others.length) {
        lead = `Você recebe avisos deste produto ${withPreposition([store, ...otherNames])}.`
      } else {
        lead = `Você recebe avisos deste produto no ${store} e ${elsewhere(others, offers)}.`
      }
    }
    let hereDescription = 'Só este mercado.'
    if (all) hereDescription = 'Troca: deixa de avisar dos outros mercados.'
    else if (others.length) hereDescription = `Também ${elsewhere(others, offers)}.`
    return {
      mode,
      title: 'Avisos deste produto',
      lead,
      note: '',
      options: [
        { key: 'here', title: `${all ? 'Só no' : 'No'} ${store}`, description: hereDescription, active: !all },
        {
          key: 'all',
          title: 'Em todos os mercados',
          description: all ? 'Qualquer mercado de Joinville.' : 'Troca: passa a avisar de qualquer mercado.',
          active: all,
        },
      ],
      offActions: !all && others.length
        ? [
            { action: 'unfollow_store', label: `Desligar no ${store}` },
            { action: 'unfollow_all', label: 'Desligar em todos' },
          ]
        : [{ action: 'unfollow_all', label: 'Desligar avisos deste produto' }],
      footnote: '',
    }
  }

  const followsElsewhere = others.length > 0
  const summary = marketSummary(offers, input.now)
  const firstTime = input.instructionMode === 'request-permission'
    ? 'Na primeira vez, o navegador pede permissão. '
    : ''
  return {
    mode,
    title: 'Onde você quer acompanhar?',
    lead: 'Avisamos quando sair oferta nova ou o preço mudar.',
    note: followsElsewhere ? `Você já recebe avisos deste produto ${elsewhere(others, offers)}.` : '',
    options: [
      {
        key: 'here',
        title: `${followsElsewhere ? 'Também no' : 'Só no'} ${store}`,
        description: followsElsewhere
          ? `Continua avisando ${elsewhere(others, offers)}.`
          : 'Quando este mercado publicar encarte com o produto.',
        active: false,
      },
      {
        key: 'all',
        title: 'Em todos os mercados',
        description: followsElsewhere ? `${summary} Substitui a sua lista.` : summary,
        active: false,
      },
    ],
    offActions: [],
    footnote: `${firstTime}Para mudar ou desligar, toque no sino.`,
  }
}

/** Opção da folha → ação da API. */
export function pickAction(pick: FollowPick): ProductFollowAction {
  return pick === 'all' ? 'follow_all' : 'follow_store'
}

/** Aviso passageiro da barra depois de uma ação que deu certo. */
export function followActionMessage(
  action: ProductFollowAction,
  before: ProductFollowState,
  storeName: string,
): string {
  if (action === 'follow_store') {
    return before.scope === 'all' ? `Avisos agora só no ${storeName}` : `Pronto! Avisos no ${storeName}`
  }
  if (action === 'follow_all') {
    return before.scope === 'stores' ? 'Avisos agora em todos os mercados' : 'Pronto! Avisos em todos os mercados'
  }
  if (action === 'unfollow_store') return `Avisos desligados no ${storeName}`
  return 'Avisos desligados'
}

/** Texto da opção enquanto a ação roda. */
export function followBusyText(instructionMode: FollowInstructionMode): string {
  return instructionMode === 'request-permission' ? 'Aguardando a permissão do navegador…' : 'Ativando…'
}

/** "R$ 1,99 com clube no Komprão…" para o cabeçalho da folha. */
export function followPriceLine(offer: JboOffer): string {
  const club = offerMainPrice(offer)?.isClub ? ' com clube' : ''
  return `${formatOfferPrice(offer)}${club} no ${offer.establishment_name}`
}
