import { describe, expect, it } from 'vitest'
import {
  branchesSummary,
  googleMapsDirectionsUrl,
  phoneHref,
  storeBranches,
  wazeUrl,
  whatsappUrl,
  type StoreBranch,
} from '../app/utils/storeDirections'

const bistek: StoreBranch = {
  address: 'Rua Tuiuti, nº 1500',
  lat: -26.25801,
  lng: -48.819607,
  google_place_id: 'ChIJ78Qt9j2u3pQRuEVEeq55fbw',
  phones: [{ number: '(47) 3026-1840', is_whatsapp: false }],
}

const semMapa: StoreBranch = {
  address: 'Rua Sem Mapa, 5',
  lat: null,
  lng: null,
  google_place_id: '',
  phones: [],
}

describe('googleMapsDirectionsUrl (rota no app de mapas)', () => {
  it('usa as coordenadas e o place_id da filial', () => {
    expect(googleMapsDirectionsUrl(bistek, 'Bistek Supermercados')).toBe(
      'https://www.google.com/maps/dir/?api=1'
      + '&destination=-26.25801%2C-48.819607'
      + '&destination_place_id=ChIJ78Qt9j2u3pQRuEVEeq55fbw',
    )
  })

  it('sem place_id, só as coordenadas', () => {
    expect(googleMapsDirectionsUrl({ ...bistek, google_place_id: '' }, 'Bistek')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-26.25801%2C-48.819607',
    )
  })

  it('sem coordenadas, busca pelo nome da loja e endereço em Joinville', () => {
    expect(googleMapsDirectionsUrl(semMapa, 'Bistek Supermercados')).toBe(
      'https://www.google.com/maps/dir/?api=1'
      + '&destination=Bistek%20Supermercados%2C%20Rua%20Sem%20Mapa%2C%205%2C%20Joinville%20-%20SC',
    )
  })

  it('não repete a cidade quando o endereço já traz Joinville', () => {
    const branch = { ...semMapa, address: 'R. Albano Schmidt, 700 - Boa Vista, Joinville - SC' }
    expect(googleMapsDirectionsUrl(branch, 'Komprão')).toBe(
      'https://www.google.com/maps/dir/?api=1'
      + '&destination=Kompr%C3%A3o%2C%20R.%20Albano%20Schmidt%2C%20700%20-%20Boa%20Vista%2C%20Joinville%20-%20SC',
    )
  })

  it('coordenada zerada ainda é coordenada', () => {
    const branch = { ...semMapa, lat: 0, lng: -48.8 }
    expect(googleMapsDirectionsUrl(branch, 'X')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=0%2C-48.8',
    )
  })
})

describe('wazeUrl', () => {
  it('navega direto para as coordenadas', () => {
    expect(wazeUrl(bistek, 'Bistek Supermercados')).toBe(
      'https://waze.com/ul?ll=-26.25801%2C-48.819607&navigate=yes',
    )
  })

  it('sem coordenadas, busca pelo nome e endereço', () => {
    expect(wazeUrl(semMapa, 'Bistek Supermercados')).toBe(
      'https://waze.com/ul?q=Bistek%20Supermercados%2C%20Rua%20Sem%20Mapa%2C%205%2C%20Joinville%20-%20SC&navigate=yes',
    )
  })
})

describe('phoneHref (discagem no celular)', () => {
  it.each([
    ['(47) 3026-1840', 'tel:+554730261840'],
    ['(47) 99191-4927', 'tel:+5547991914927'],
    ['+55 47 3305-8050', 'tel:+554733058050'],
    ['0800 643 2000', 'tel:08006432000'],
  ])('%s → %s', (number, href) => {
    expect(phoneHref(number)).toBe(href)
  })

  it('sem dígitos não vira link', () => {
    expect(phoneHref(' - ')).toBeNull()
  })
})

describe('whatsappUrl', () => {
  it('número com DDD vira conversa com +55', () => {
    expect(whatsappUrl('(47) 99191-4927')).toBe('https://wa.me/5547991914927')
  })

  it('número já com 55 não duplica o código do país', () => {
    expect(whatsappUrl('+55 (47) 99191-4927')).toBe('https://wa.me/5547991914927')
  })

  it('0800 não tem WhatsApp', () => {
    expect(whatsappUrl('0800 643 2000')).toBeNull()
  })
})

describe('storeBranches (lista vinda da API)', () => {
  it('usa as filiais quando a API manda a lista', () => {
    const branches = [bistek, semMapa]
    expect(storeBranches({ address: 'Rua Tuiuti, nº 1500', addresses: branches })).toEqual(branches)
  })

  it('API antiga (sem addresses): o endereço principal vira uma filial sem mapa', () => {
    expect(storeBranches({ address: ' Rua Tuiuti, nº 1500 ' })).toEqual([
      { address: 'Rua Tuiuti, nº 1500', lat: null, lng: null, google_place_id: '', phones: [] },
    ])
  })

  it('API antiga sem endereço nenhum: lista vazia', () => {
    expect(storeBranches({ address: '' })).toEqual([])
  })
})

describe('branchesSummary (linha abaixo do nome da loja)', () => {
  it('sem filial não mostra nada', () => {
    expect(branchesSummary([])).toBe('')
  })

  it('uma filial mostra o próprio endereço', () => {
    expect(branchesSummary([bistek])).toBe('Rua Tuiuti, nº 1500')
  })

  it('várias filiais mostram a contagem', () => {
    expect(branchesSummary([bistek, semMapa])).toBe('2 endereços')
  })
})
