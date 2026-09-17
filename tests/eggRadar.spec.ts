import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  EGG_RADAR_BLOCKED_HINT,
  EGG_RADAR_DESCRIPTION,
  EGG_RADAR_NOT_GRANTED_HINT,
  EGG_RADAR_PATH,
  EGG_RADAR_TITLE,
  EGG_RADAR_UNSUPPORTED_HINT,
  eggRadarBellLabel,
  eggRadarBlockedHint,
  eggRadarCaption,
  eggRadarCountLabel,
  eggRadarPermissionHint,
} from '../app/utils/eggRadar'
import { PUSH_HINT_DENIED, PUSH_HINT_INSTALL_IOS } from '../app/utils/webPush'

const root = resolve(import.meta.dirname, '..')
/** Lê um arquivo do projeto como texto (asserções de código-fonte). */
const source = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('textos do Radar do ovo', () => {
  it('nome, descrição e rota combinados com o pedido', () => {
    expect(EGG_RADAR_TITLE).toBe('Radar do ovo')
    expect(EGG_RADAR_DESCRIPTION).toBe('Onde comprar ovos hoje')
    expect(EGG_RADAR_PATH).toBe('/radar-do-ovo')
  })

  it('legenda e rótulo do sino mudam com o estado', () => {
    expect(eggRadarCaption(false)).toEqual({ text: 'Receba aviso de oferta de ovos', on: false })
    expect(eggRadarCaption(true)).toEqual({ text: 'Avisos de ovos ligados', on: true })
    expect(eggRadarBellLabel(false)).toBe('Avisar quando aparecer oferta de ovos')
    expect(eggRadarBellLabel(true)).toContain('Toque para desligar')
  })

  it('contagem no singular e no plural', () => {
    expect(eggRadarCountLabel(1)).toBe('1 oferta de ovos hoje')
    expect(eggRadarCountLabel(7)).toBe('7 ofertas de ovos hoje')
  })
})

describe('recados do sino do radar', () => {
  it('iPhone fora do app pede instalação; outro navegador sem push só avisa', () => {
    expect(eggRadarBlockedHint('ios-install', true)).toBe(PUSH_HINT_INSTALL_IOS)
    expect(eggRadarBlockedHint('ios-install', false)).toBe(EGG_RADAR_UNSUPPORTED_HINT)
    expect(eggRadarBlockedHint('request-permission', true)).toBe('')
    expect(eggRadarBlockedHint('permission-denied', false)).toBe('')
    expect(eggRadarBlockedHint('ready', false)).toBe('')
  })

  it('permissão bloqueada é diferente de prompt só dispensado', () => {
    expect(eggRadarPermissionHint(PUSH_HINT_DENIED, 'denied')).toBe(EGG_RADAR_BLOCKED_HINT)
    expect(eggRadarPermissionHint(PUSH_HINT_DENIED, 'default')).toBe(EGG_RADAR_NOT_GRANTED_HINT)
    expect(eggRadarPermissionHint('Outro recado', 'default')).toBe('Outro recado')
  })
})

describe('home: carrossel do Radar do ovo', () => {
  const home = source('app/pages/index.vue')

  it('fica logo abaixo dos carrosséis de categoria (Hortifruti é o último) e antes de Termina hoje', () => {
    const categories = home.indexOf('v-for="section in categorySections"')
    const radar = home.indexOf('data-test="home-egg-radar"')
    const ending = home.indexOf('title="Termina hoje"')
    expect(categories).toBeGreaterThan(-1)
    expect(radar).toBeGreaterThan(categories)
    expect(radar).toBeLessThan(ending)
  })

  it('mostra título, descrição, link para a página e só ofertas vigentes', () => {
    expect(home).toContain(':title="`${EGG_RADAR_EMOJI} ${EGG_RADAR_TITLE}`"')
    expect(home).toContain(':subtitle="EGG_RADAR_DESCRIPTION"')
    expect(home).toContain('<NuxtLink :to="EGG_RADAR_PATH">Ver todas</NuxtLink>')
    expect(home).toContain('jboGet<JboOffersPage>(EGG_RADAR_API_PATH, { limit: HOME_CAROUSEL_PAGE_SIZE })')
    expect(home).toContain('pickCategoryHighlights(eggRadarResult.data.value?.items || [], HOME_CAROUSEL_LIMIT, now.value)')
  })

  it('HomeSection aceita subtítulo abaixo do título', () => {
    const section = source('app/components/home/HomeSection.vue')
    expect(section).toContain('<p v-if="subtitle" class="hsec__subtitle">{{ subtitle }}</p>')
  })

  it('o front não refiltra ovos por nome: a regra é do snap-api', () => {
    expect(source('app/utils/eggRadar.ts')).toContain("EGG_RADAR_API_PATH = '/radar/ovos'")
  })
})

describe('menu: link do Radar do ovo', () => {
  it('logo após Início, com selo Novo', () => {
    const menu = source('app/components/HeaderMenu.vue')
    const inicio = menu.indexOf('Início')
    const radar = menu.indexOf('data-test="menu-egg-radar"')
    expect(radar).toBeGreaterThan(inicio)
    expect(radar).toBeLessThan(menu.indexOf('to="/lojas"'))
    expect(menu).toContain(':to="EGG_RADAR_PATH"')
    expect(menu).toContain('<span class="hmenu__tag">Novo</span>')
  })
})

describe('página /radar-do-ovo', () => {
  const page = source('app/pages/radar-do-ovo.vue')
  const bar = source('app/components/radar/EggRadarActionsBar.vue')

  it('tem trilha, barra de ações acima do título, descrição e lista de ofertas', () => {
    expect(page).toContain('siteTrail({ label: EGG_RADAR_TITLE })')
    expect(page.indexOf('<EggRadarActionsBar />')).toBeLessThan(page.indexOf('<h1>'))
    expect(page).toContain('{{ EGG_RADAR_DESCRIPTION }}')
    expect(page).toContain('v-for="offer in items"')
    expect(page).toContain('jboGet<JboOffersPage>(EGG_RADAR_API_PATH, { limit: EGG_RADAR_PAGE_LIMIT })')
    expect(page).toContain('path: EGG_RADAR_PATH')
  })

  it('barra com Compartilhar e Sino, só ícone e 44px', () => {
    const share = bar.indexOf('data-test="egg-radar-share"')
    const bell = bar.indexOf('data-test="egg-radar-follow"')
    expect(share).toBeGreaterThan(-1)
    expect(share).toBeLessThan(bell)
    expect(bar).toContain('aria-label="Compartilhar Radar do ovo"')
    expect(bar).toContain(':aria-label="bellLabel"')
    expect(bar).toContain(":aria-pressed=\"following ? 'true' : 'false'\"")
    expect(bar).toMatch(/width:\s*44px/)
    expect(bar).toContain('useShareLink')
    expect(bar).toContain("'Link copiado'")
    expect(bar).toContain('url: `${origin}${EGG_RADAR_PATH}`')
    expect(bar).toContain('aria-live="polite"')
  })

  it('sino consulta e grava no snap-api; desligar não pede permissão', () => {
    const src = source('app/composables/useJboEggRadarFollow.ts')
    expect(src).toContain("'/push/egg-radar/query'")
    expect(src).toContain("'/push/egg-radar'")
    expect(src).toContain('loadSeq')
    const off = src.slice(src.indexOf('async function turnOff'), src.indexOf('async function turnOn'))
    expect(off).not.toContain('ensurePushDevice')
    const on = src.slice(src.indexOf('async function turnOn'))
    expect(on.indexOf('eggRadarBlockedHint')).toBeLessThan(on.indexOf('ensurePushDevice'))
  })

  it('entra no sitemap e no llms.txt', () => {
    expect(source('server/routes/sitemap.xml.ts')).toContain("'/radar-do-ovo'")
    expect(source('server/routes/llms.txt.ts')).toContain('/radar-do-ovo')
  })
})
