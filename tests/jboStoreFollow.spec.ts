import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('sino anônimo segue loja', () => {
  it('envia POST/PUT públicos via jboSend', () => {
    const api = source('app/utils/jboApi.ts')
    expect(api).toContain('export async function jboSend')
    expect(api).toContain("method: 'POST' | 'PUT'")
    expect(api).toContain('`${apiOrigin()}/api/public/jbo${path}`')
    expect(api).toContain('method,\n    body,\n    headers: apiHeaders(),')
  })

  it('tem composable com follow compartilhado e toggle; VAPID no webPush', () => {
    const path = 'app/composables/useJboStoreFollow.ts'
    expect(existsSync(resolve(root, path))).toBe(true)

    const src = source(path)
    expect(src).toContain("useState<string[]>('jbo:followed-stores'")
    expect(src).toContain('isFollowing')
    expect(src).toContain('function toggle')
    expect(src).toContain('requestToggle')
    expect(src).toContain('confirmFollow')
    expect(src).toContain("useState('jbo:follow-confirm-open'")
    expect(src).toContain("'/push/follows/query'")
    expect(src).toContain('ensurePushDevice')
    expect(src).toContain('usePwaInstall')
    const push = source('app/utils/webPush.ts')
    expect(push).toContain("'/push/vapid-public-key'")
    expect(push).toContain('urlBase64ToUint8Array')
  })

  it('toggle pede permissão, registra device e grava o follow', () => {
    const push = source('app/utils/webPush.ts')
    expect(push).toContain('Notification.requestPermission')
    expect(push).toContain('userVisibleOnly: true')
    expect(push).toContain('applicationServerKey')
    expect(push).toContain("'/push/devices'")
    expect(push).toContain('p256dh')
    expect(push).toContain('user_agent')
    const src = source('app/composables/useJboStoreFollow.ts')
    expect(src).toContain("'/push/follows'")
    expect(src).toContain('following:')
  })

  it('não finge follow se a permissão for negada', () => {
    const push = source('app/utils/webPush.ts')
    expect(push).toMatch(/!== ['"]granted['"]/)
    expect(push).toContain('Permissão de notificação negada')
    const toggleFn = source('app/composables/useJboStoreFollow.ts').slice(
      source('app/composables/useJboStoreFollow.ts').indexOf('async function toggle'),
    )
    expect(toggleFn.indexOf('if (!endpoint) return')).toBeLessThan(toggleFn.indexOf('applyFollow('))
  })

  it('checa iOS e PushManager antes de pedir permissão', () => {
    const push = source('app/utils/webPush.ts')
    const ensure = push.slice(push.indexOf('export async function ensurePushDevice'))
    const ios = ensure.indexOf('isIos && !isStandalone')
    const support = ensure.indexOf('detectPushSupport()')
    const perm = ensure.indexOf('Notification.requestPermission')
    expect(ios).toBeGreaterThan(-1)
    expect(support).toBeGreaterThan(-1)
    expect(ios).toBeLessThan(perm)
    expect(support).toBeLessThan(perm)
  })

  it('não espera serviceWorker.ready sem limite', () => {
    const push = source('app/utils/webPush.ts')
    expect(push).toContain('getRegistration')
    expect(push).toMatch(/Promise\.race|setTimeout/)
  })

  it('mostra recado no iOS fora de standalone e sem PushManager', () => {
    const src = source('app/composables/useJboStoreFollow.ts')
    expect(src).toContain('isIos')
    expect(src).toContain('isStandalone')
    const push = source('app/utils/webPush.ts')
    expect(push).toContain('PushManager')
    expect(push).toContain('instale o app na tela inicial')
  })

  it('SW mostra notificação, prefixa origem e não usa inbox/badge', () => {
    const sw = source('app/sw.ts')
    expect(sw).toContain('self.location.origin')
    expect(sw).toContain('showNotification')
    expect(sw).toContain('renotify: Boolean(payload?.tag && payload?.renotify)')
    expect(sw).not.toContain('setAppBadge')
    expect(sw).not.toContain('unread_count')
    expect(sw).not.toContain('notification_id')
    expect(sw).not.toContain('PUSH_NOTIFICATION')
  })

  it('tem sino na página de detalhe, irmão do compartilhar', () => {
    const page = source('app/pages/encarte/[id].vue')
    expect(page).toContain('aria-label="Receber avisos desta loja"')
    expect(page).toContain('useJboStoreFollow')
    expect(page).toContain('aria-pressed')
  })

  it('sino do card usa alvo 44px, canto superior esquerdo e aria-pressed', () => {
    const card = source('app/components/encartes/EncarteCard.vue')
    expect(card).toContain('aria-pressed')
    expect(card).toMatch(/\.card__bell[^{]*\{[^}]*left:/)
    expect(card).toMatch(/\.card__bell[^{]*\{[^}]*z-index:\s*2/)
    expect(card).toMatch(/\.card__bell[^{]*\{[^}]*(?:min-width|width):\s*44px/)
    expect(card).toContain('--yellow')
    expect(card).toContain('--surface')
    expect(card).toContain('[aria-pressed="true"]')
  })

  it('tem componente reutilizável do sino com alvo 44px e aria-pressed', () => {
    const bell = source('app/components/StoreFollowBell.vue')
    expect(bell).toContain('aria-label="Receber avisos desta loja"')
    expect(bell).toContain('aria-pressed')
    expect(bell).toContain('requestToggle')
    expect(bell).toContain('storeName')
    expect(bell).toContain('@click.stop')
    expect(bell).toMatch(/(?:min-width|width):\s*44px/)
  })

  it('tem modal de confirmação com nome da loja e instruções', () => {
    const modal = source('app/components/StoreFollowConfirmModal.vue')
    expect(modal).toContain('Seguir esta loja?')
    expect(modal).toContain('{{ storeName }}')
    expect(modal).toContain('instructionMode')
    expect(modal).toContain('useDialogLock')
    expect(modal).toContain('Agora não')
    expect(modal).toContain('<PushInstructions')
    expect(source('app/app.vue')).toContain('StoreFollowConfirmModal')
  })

  it('abre confirmação ao seguir e usa requestToggle nos sinos', () => {
    const composable = source('app/composables/useJboStoreFollow.ts')
    expect(composable).toContain('confirmOpen.value = true')
    expect(composable).toMatch(/if \(isFollowing\(establishmentId\)\)/)

    expect(source('app/components/encartes/EncarteCard.vue')).toContain('requestToggle')
    expect(source('app/pages/encarte/[id].vue')).toContain('requestToggle')
  })

  it('mostra sino dentro do box de cada loja na listagem', () => {
    const page = source('app/pages/lojas.vue')
    expect(page).toContain('StoreFollowBell')
    expect(page).toContain(':store-name="est.name"')
    expect(page).toContain('class="list__item"')
    expect(page).toContain('class="list__main"')
    const itemBlock = page.slice(page.indexOf('class="list__item"'))
    expect(itemBlock.indexOf('StoreFollowBell')).toBeGreaterThan(-1)
    expect(itemBlock.indexOf('</NuxtLink>')).toBeLessThan(itemBlock.indexOf('StoreFollowBell'))
  })

  it('na página da loja o sino fica na barra de ações, acima do nome', () => {
    const page = source('app/pages/loja/[slug].vue')
    const bar = source('app/components/store/StoreActionsBar.vue')
    expect(bar).toContain('<StoreFollowBell :establishment-id="establishmentId" :store-name="storeName" />')
    expect(page).toContain(':establishment-id="data.establishment.id"')
    expect(page.indexOf('<StoreActionsBar')).toBeGreaterThan(-1)
    expect(page.indexOf('<StoreActionsBar')).toBeLessThan(page.indexOf('<h1>'))
    expect(page).not.toContain('<StoreFollowBell')
    expect(page).toContain('hide-store')
  })
})
