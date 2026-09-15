import { describe, expect, it } from 'vitest'
import type { JboOffer } from '../app/utils/jboApi'
import {
  EMPTY_FOLLOW_STATE,
  followActionMessage,
  followBellLabel,
  followBusyText,
  followCaption,
  followPriceLine,
  followSheetMode,
  followSheetView,
  followsHere,
  marketSummary,
  pickAction,
  type ProductFollowState,
} from '../app/utils/productFollow'

const nbsp = ' '
const NOW = new Date('2026-09-14T15:00:00-03:00')
const K = 'komprao'
const C = 'carolina'

/** Cria uma oferta de teste com os campos obrigatórios do JboOffer. */
function offer(partial: Partial<JboOffer> & Pick<JboOffer, 'id' | 'establishment_id' | 'establishment_name'>): JboOffer {
  return {
    product_id: 'milho',
    product_name: 'Milho Verde',
    product_slug: 'bonare-milho-verde',
    establishment_slug: partial.establishment_id,
    price: '2.49',
    recorded_at: '2026-09-14T00:00:00Z',
    promo_starts_on: '2026-09-10',
    promo_ends_on: '2026-09-20',
    ...partial,
  }
}

const OFFERS = [
  offer({ id: '1', establishment_id: K, establishment_name: 'Komprão Koch Atacadista', price: '2.29', club_price: '1.99' }),
  offer({ id: '2', establishment_id: C, establishment_name: 'Supermercado Carolina', price: '2.49' }),
  offer({ id: '3', establishment_id: 'mini', establishment_name: 'Mini Preço Supermercados', price: '2.99' }),
  offer({ id: '4', establishment_id: 'velho', establishment_name: 'Mercado Vencido', price: '1.00', promo_ends_on: '2026-09-01' }),
]

/** Cria um estado de seguimento com os mercados especificados. */
const stores = (...ids: string[]): ProductFollowState => ({ scope: 'stores', establishment_ids: ids })
const ALL: ProductFollowState = { scope: 'all', establishment_ids: [] }

/** Renderiza a folha do sino com os argumentos padrão de teste. */
function view(state: ProductFollowState, instructionMode: 'request-permission' | 'ready' | 'ios-install' | 'permission-denied' = 'ready') {
  return followSheetView({
    state, pageStoreId: K, pageStoreName: 'Komprão Koch Atacadista', offers: OFFERS, instructionMode, now: NOW,
  })
}

describe('sino por mercado: estado e legenda', () => {
  it('sabe se o aviso vale para o mercado da página', () => {
    expect(followsHere(EMPTY_FOLLOW_STATE, K)).toBe(false)
    expect(followsHere(ALL, K)).toBe(true)
    expect(followsHere(stores(K), K)).toBe(true)
    expect(followsHere(stores(C), K)).toBe(false)
  })

  it('legenda ao lado do sino em cada situação', () => {
    expect(followCaption(EMPTY_FOLLOW_STATE, K)).toEqual({ text: '', on: false })
    expect(followCaption(stores(K), K)).toEqual({ text: 'Avisos neste mercado', on: true })
    expect(followCaption(stores(K, C), K)).toEqual({ text: 'Avisos aqui e em mais 1 mercado', on: true })
    expect(followCaption(stores(K, C, 'mini'), K).text).toBe('Avisos aqui e em mais 2 mercados')
    expect(followCaption(ALL, K)).toEqual({ text: 'Avisos em todos os mercados', on: true })
    expect(followCaption(stores(C), K)).toEqual({ text: 'Você segue em outro mercado', on: false })
    expect(followCaption(stores(C, 'mini'), K).text).toBe('Você segue em 2 outros mercados')
  })

  it('rótulo acessível do sino', () => {
    expect(followBellLabel(EMPTY_FOLLOW_STATE, K)).toBe('Receber avisos deste produto')
    expect(followBellLabel(stores(K), K)).toBe('Avisos ativos neste mercado. Toque para mudar')
    expect(followBellLabel(ALL, K)).toBe('Avisos ativos em todos os mercados. Toque para mudar')
  })

  it('modo da folha: gerenciar vence as instruções; iPhone e bloqueio antes da escolha', () => {
    expect(followSheetMode(stores(K), K, 'permission-denied')).toBe('manage')
    expect(followSheetMode(EMPTY_FOLLOW_STATE, K, 'ios-install')).toBe('ios')
    expect(followSheetMode(stores(C), K, 'permission-denied')).toBe('denied')
    expect(followSheetMode(EMPTY_FOLLOW_STATE, K, 'request-permission')).toBe('choose')
  })
})

describe('sino por mercado: textos da folha', () => {
  it('resumo dos mercados usa só ofertas vigentes e o menor preço principal', () => {
    expect(marketSummary(OFFERS, NOW)).toBe(`Hoje em 3 mercados, a partir de R$${nbsp}1,99.`)
    expect(marketSummary([OFFERS[1]], NOW)).toBe('Hoje só o Supermercado Carolina tem oferta; avisamos quando outro publicar.')
    expect(marketSummary([OFFERS[3]], NOW)).toBe('Avisamos quando qualquer mercado publicar.')
  })

  it('primeira vez: duas opções sem marcação e rodapé da permissão', () => {
    const v = view(EMPTY_FOLLOW_STATE, 'request-permission')
    expect(v.mode).toBe('choose')
    expect(v.title).toBe('Onde você quer acompanhar?')
    expect(v.note).toBe('')
    expect(v.options.map(o => [o.key, o.title, o.active])).toEqual([
      ['here', 'Só no Komprão Koch Atacadista', false],
      ['all', 'Em todos os mercados', false],
    ])
    expect(v.options[0].description).toBe('Quando este mercado publicar encarte com o produto.')
    expect(v.options[1].description).toBe(`Hoje em 3 mercados, a partir de R$${nbsp}1,99.`)
    expect(v.footnote).toBe('Na primeira vez, o navegador pede permissão. Para mudar ou desligar, toque no sino.')
  })

  it('já segue em outro mercado: "Também no" e nota com o nome quando conhecido', () => {
    const v = view(stores(C))
    expect(v.note).toBe('Você já recebe avisos deste produto no Supermercado Carolina.')
    expect(v.options[0].title).toBe('Também no Komprão Koch Atacadista')
    expect(v.options[0].description).toBe('Continua avisando no Supermercado Carolina.')
    expect(v.options[1].description).toBe(`Hoje em 3 mercados, a partir de R$${nbsp}1,99. Substitui a sua lista.`)
    expect(view(stores('desconhecido')).note).toBe('Você já recebe avisos deste produto em outro mercado.')
  })

  it('gerenciar: opção ativa marcada, troca explicada e desligar certo', () => {
    const here = view(stores(K))
    expect(here.mode).toBe('manage')
    expect(here.title).toBe('Avisos deste produto')
    expect(here.lead).toBe('Você recebe um aviso quando o Komprão Koch Atacadista publicar oferta nova ou mudar o preço.')
    expect(here.options.map(o => [o.title, o.active, o.description])).toEqual([
      ['No Komprão Koch Atacadista', true, 'Só este mercado.'],
      ['Em todos os mercados', false, 'Troca: passa a avisar de qualquer mercado.'],
    ])
    expect(here.offActions).toEqual([{ action: 'unfollow_all', label: 'Desligar avisos deste produto' }])

    const both = view(stores(K, C))
    expect(both.lead).toBe('Você recebe avisos deste produto no Komprão Koch Atacadista e no Supermercado Carolina.')
    expect(both.options[0].description).toBe('Também no Supermercado Carolina.')
    expect(both.offActions).toEqual([
      { action: 'unfollow_store', label: 'Desligar no Komprão Koch Atacadista' },
      { action: 'unfollow_all', label: 'Desligar em todos' },
    ])

    const all = view(ALL)
    expect(all.options.map(o => [o.title, o.active, o.description])).toEqual([
      ['Só no Komprão Koch Atacadista', false, 'Troca: deixa de avisar dos outros mercados.'],
      ['Em todos os mercados', true, 'Qualquer mercado de Joinville.'],
    ])
    expect(all.offActions).toEqual([{ action: 'unfollow_all', label: 'Desligar avisos deste produto' }])
  })

  it('iPhone e bloqueio têm título e texto próprios, sem opções', () => {
    expect(view(EMPTY_FOLLOW_STATE, 'ios-install')).toMatchObject({ mode: 'ios', title: 'Instale o app para receber avisos', options: [] })
    expect(view(EMPTY_FOLLOW_STATE, 'permission-denied')).toMatchObject({ mode: 'denied', title: 'Notificações bloqueadas', options: [] })
  })
})

describe('sino por mercado: ações e avisos', () => {
  it('opção vira ação da API', () => {
    expect(pickAction('here')).toBe('follow_store')
    expect(pickAction('all')).toBe('follow_all')
  })

  it('aviso passageiro de cada ação', () => {
    const store = 'Komprão Koch Atacadista'
    expect(followActionMessage('follow_store', EMPTY_FOLLOW_STATE, store)).toBe('Pronto! Avisos no Komprão Koch Atacadista')
    expect(followActionMessage('follow_store', ALL, store)).toBe('Avisos agora só no Komprão Koch Atacadista')
    expect(followActionMessage('follow_all', EMPTY_FOLLOW_STATE, store)).toBe('Pronto! Avisos em todos os mercados')
    expect(followActionMessage('follow_all', stores(C), store)).toBe('Avisos agora em todos os mercados')
    expect(followActionMessage('unfollow_store', stores(K, C), store)).toBe('Avisos desligados no Komprão Koch Atacadista')
    expect(followActionMessage('unfollow_all', ALL, store)).toBe('Avisos desligados')
  })

  it('texto de espera e linha de preço do cabeçalho', () => {
    expect(followBusyText('request-permission')).toBe('Aguardando a permissão do navegador…')
    expect(followBusyText('ready')).toBe('Ativando…')
    expect(followPriceLine(OFFERS[0])).toBe(`R$${nbsp}1,99 com clube no Komprão Koch Atacadista`)
    expect(followPriceLine(OFFERS[1])).toBe(`R$${nbsp}2,49 no Supermercado Carolina`)
  })
})
