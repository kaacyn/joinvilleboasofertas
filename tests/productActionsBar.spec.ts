import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
/** Lê um arquivo do projeto como texto (asserções de código-fonte). */
const source = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('sino do produto', () => {
  it('composable consulta e grava no snap-api pelo endpoint do push', () => {
    const src = source('app/composables/useJboProductFollow.ts')
    expect(src).toContain("'/push/product-follows/query'")
    expect(src).toContain("'/push/product-follows'")
    expect(src).toContain('ensurePushDevice')
    expect(src).toContain('currentPushEndpoint')
    expect(src).toContain('loadSeq')
    expect(src).toContain('const target = {')
    expect(src).toContain('establishment_id: target.storeId')
    expect(src).toContain('followActionMessage')
    expect(src).toContain('Notificações bloqueadas. Toque no sino para ver como liberar.')
  })

  it('desligar não pede permissão; seguir pede', () => {
    const src = source('app/composables/useJboProductFollow.ts')
    const fn = src.slice(src.indexOf('async function endpointFor'))
    expect(fn.indexOf("action === 'unfollow_store' || action === 'unfollow_all'")).toBeLessThan(fn.indexOf('ensurePushDevice'))
  })

  it('folha mostra opções como botões que já ativam, com selo Ativo e desligar', () => {
    const sheet = source('app/components/offers/ProductFollowSheet.vue')
    expect(sheet).toContain('v-for="option in view.options"')
    expect(sheet).toContain(':aria-current="option.active ? \'true\' : undefined"')
    expect(sheet).toContain('Ativo')
    expect(sheet).toContain("emit('pick', option.key)")
    expect(sheet).toContain('v-for="off in view.offActions"')
    expect(sheet).toContain('<PushInstructions')
    expect(sheet).toContain('goal="ativar os avisos"')
    expect(sheet).toContain('useDialogLock')
    expect(sheet).toContain('@media (min-width: 560px)')
    expect(sheet).not.toContain('Confirmar')
    expect(sheet).toContain('min-height: 44px')
    expect(sheet).toContain('width: 44px')
  })
})

describe('barra de ações do produto', () => {
  it('três botões na ordem Reportar · Compartilhar · Sino, só ícone e 44px', () => {
    const bar = source('app/components/offers/ProductActionsBar.vue')
    const report = bar.indexOf('data-test="product-report"')
    const share = bar.indexOf('data-test="product-share"')
    const bell = bar.indexOf('data-test="product-follow"')
    expect(report).toBeGreaterThan(-1)
    expect(report).toBeLessThan(share)
    expect(share).toBeLessThan(bell)
    expect(bar).toContain('aria-label="Reportar um erro"')
    expect(bar).toContain('aria-label="Compartilhar oferta"')
    expect(bar).toContain(':aria-label="bellLabel"')
    expect(bar).toContain(':aria-pressed=')
    expect(bar).toMatch(/width:\s*44px/)
  })

  it('linha de avisos: compartilhar e sino antes da legenda, legenda abre a folha', () => {
    const bar = source('app/components/offers/ProductActionsBar.vue')
    expect(bar).toContain("'Link copiado'")
    expect(bar).toContain('useShareLink')
    expect(bar).toContain('followCaption')
    expect(bar).toContain('data-test="product-follow-caption"')
    expect(bar).toContain('aria-live="polite"')
    expect(bar).toContain('followInstructionMode(isIos.value, isStandalone.value)')
  })

  it('usa as duas folhas e o composable do sino', () => {
    const bar = source('app/components/offers/ProductActionsBar.vue')
    expect(bar).toContain('<ReportOfferSheet')
    expect(bar).toContain('<ProductFollowSheet')
    expect(bar).toContain('useJboProductFollow(productId, pageStoreId, pageStoreName)')
    expect(bar).toContain('title: props.productTitle')
  })
})
