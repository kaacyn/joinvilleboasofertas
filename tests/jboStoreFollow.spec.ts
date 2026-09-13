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

  it('tem composable com follow compartilhado, VAPID e toggle', () => {
    const path = 'app/composables/useJboStoreFollow.ts'
    expect(existsSync(resolve(root, path))).toBe(true)

    const src = source(path)
    expect(src).toContain("useState<string[]>('jbo:followed-stores'")
    expect(src).toContain('isFollowing')
    expect(src).toContain('function toggle')
    expect(src).toContain('requestToggle')
    expect(src).toContain('confirmFollow')
    expect(src).toContain("useState('jbo:follow-confirm-open'")
    expect(src).toContain("'/push/vapid-public-key'")
    expect(src).toContain("'/push/follows/query'")
    expect(src).toContain('urlBase64ToUint8Array')
    expect(src).toContain('usePwaInstall')
  })

  it('toggle pede permissão, registra device e grava o follow', () => {
    const src = source('app/composables/useJboStoreFollow.ts')
    expect(src).toContain('Notification.requestPermission')
    expect(src).toContain('userVisibleOnly: true')
    expect(src).toContain('applicationServerKey')
    expect(src).toContain("'/push/devices'")
    expect(src).toContain("'/push/follows'")
    expect(src).toContain('p256dh')
    expect(src).toContain('user_agent')
    expect(src).toContain('following:')
  })

  it('não finge follow se a permissão for negada', () => {
    const src = source('app/composables/useJboStoreFollow.ts')
    expect(src).toMatch(/!== ['"]granted['"]/)
    expect(src).toContain('Permissão de notificação negada')
  })

  it('reverte o sino se o PUT de follow falhar', () => {
    const src = source('app/composables/useJboStoreFollow.ts')
    expect(src).toContain('catch')
    const toggleFn = src.slice(src.indexOf('async function toggle'))
    expect(toggleFn).toContain('await loadOnce()')
    expect(toggleFn).not.toContain('followedIds.value = previous')
    expect(src).toMatch(/followedIds\.value = followedIds\.value\.filter/)
  })

  it('checa iOS e PushManager antes de pedir permissão', () => {
    const src = source('app/composables/useJboStoreFollow.ts')
    const toggleFn = src.slice(src.indexOf('async function toggle'))
    const ios = toggleFn.indexOf('isIos.value && !isStandalone.value')
    const push = toggleFn.indexOf('detectPushSupport')
    const perm = toggleFn.indexOf('Notification.requestPermission')
    expect(ios).toBeGreaterThan(-1)
    expect(push).toBeGreaterThan(-1)
    expect(perm).toBeGreaterThan(-1)
    expect(ios).toBeLessThan(perm)
    expect(push).toBeLessThan(perm)
  })

  it('não espera serviceWorker.ready sem limite', () => {
    const src = source('app/composables/useJboStoreFollow.ts')
    expect(src).toContain('getRegistration')
    expect(src).toMatch(/Promise\.race|setTimeout/)
  })

  it('mostra recado no iOS fora de standalone e sem PushManager', () => {
    const src = source('app/composables/useJboStoreFollow.ts')
    expect(src).toContain('isIos')
    expect(src).toContain('isStandalone')
    expect(src).toContain('PushManager')
    expect(src).toContain('instale o app na tela inicial')
  })

  it('converte VAPID base64url em bytes', async () => {
    const path = 'app/composables/useJboStoreFollow.ts'
    expect(existsSync(resolve(root, path))).toBe(true)
    const mod = `../${path}`
    const { urlBase64ToUint8Array } = await import(mod)
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3])
  })

  it('SW mostra notificação, prefixa origem e não usa inbox/badge', () => {
    const sw = source('app/sw.ts')
    expect(sw).toContain('self.location.origin')
    expect(sw).toContain('showNotification')
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

  it('mostra sino à direita do nome na página da loja', () => {
    const page = source('app/pages/loja/[slug].vue')
    expect(page).toContain('StoreFollowBell')
    expect(page).toContain(':establishment-id="data.establishment.id"')
    expect(page).toContain('loja-head__body')
    expect(page).toContain('show-hint')
    expect(page).toContain('hide-store')
  })
})
