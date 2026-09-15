import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PUSH_HINT_DENIED,
  PUSH_HINT_INSTALL_IOS,
  ensurePushDevice,
  urlBase64ToUint8Array,
} from '../app/utils/webPush'

type StubOptions = { permission?: string, requestResult?: string, existing?: unknown }

/** Navegador com Notification, PushManager, service worker e $fetch falsos. */
function stubBrowser({ permission = 'granted', requestResult = 'granted', existing = null }: StubOptions = {}) {
  const requestPermission = vi.fn(async () => requestResult)
  vi.stubGlobal('Notification', { permission, requestPermission })
  vi.stubGlobal('PushManager', class {})
  const subscription = {
    endpoint: 'https://push.example/1',
    toJSON: () => ({ endpoint: 'https://push.example/1', keys: { p256dh: 'p', auth: 'a' } }),
  }
  const pushManager = {
    getSubscription: vi.fn(async () => existing),
    subscribe: vi.fn(async () => subscription),
  }
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: vi.fn(async () => ({ pushManager })), ready: new Promise(() => {}) },
  })
  const fetchMock = vi.fn(async (url: string) =>
    url.endsWith('/push/vapid-public-key') ? { public_key: 'AQID' } : { ok: true },
  )
  vi.stubGlobal('$fetch', fetchMock)
  // jboApi chama useRuntimeConfig() mesmo no browser (auto-import do Nuxt, ausente no vitest).
  vi.stubGlobal('useRuntimeConfig', () => ({ apiBase: '', apiToken: '' }))
  return { requestPermission, pushManager, fetchMock }
}

afterEach(() => {
  vi.unstubAllGlobals()
  delete (navigator as unknown as Record<string, unknown>).serviceWorker
})

describe('webPush', () => {
  it('converte VAPID base64url em bytes', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3])
  })

  it('iPhone fora do app: recado de instalação sem pedir permissão', async () => {
    const { requestPermission } = stubBrowser({ permission: 'default' })
    expect(await ensurePushDevice(true, false)).toEqual({ ok: false, hint: PUSH_HINT_INSTALL_IOS })
    expect(requestPermission).not.toHaveBeenCalled()
  })

  it('permissão negada no prompt: recado e nenhuma inscrição', async () => {
    const { pushManager } = stubBrowser({ permission: 'default', requestResult: 'denied' })
    expect(await ensurePushDevice(false, false)).toEqual({ ok: false, hint: PUSH_HINT_DENIED })
    expect(pushManager.subscribe).not.toHaveBeenCalled()
  })

  it('com permissão: inscreve com a chave VAPID e registra o dispositivo', async () => {
    const { pushManager, fetchMock } = stubBrowser({ permission: 'default' })
    const ready = await ensurePushDevice(false, false)
    expect(ready).toEqual({ ok: true, endpoint: 'https://push.example/1' })
    const options = pushManager.subscribe.mock.calls[0][0] as { userVisibleOnly: boolean, applicationServerKey: Uint8Array }
    expect(options.userVisibleOnly).toBe(true)
    expect(Array.from(options.applicationServerKey)).toEqual([1, 2, 3])
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/public/jbo/push/devices',
      expect.objectContaining({
        method: 'PUT',
        body: expect.objectContaining({ endpoint: 'https://push.example/1', p256dh: 'p', auth: 'a' }),
      }),
    )
  })

  it('reaproveita a inscrição existente', async () => {
    const existing = {
      endpoint: 'https://push.example/old',
      toJSON: () => ({ endpoint: 'https://push.example/old', keys: { p256dh: 'p', auth: 'a' } }),
    }
    const { pushManager, fetchMock } = stubBrowser({ existing })
    expect(await ensurePushDevice(false, true)).toEqual({ ok: true, endpoint: 'https://push.example/old' })
    expect(pushManager.subscribe).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/public/jbo/push/devices',
      expect.objectContaining({
        method: 'PUT',
        body: expect.objectContaining({ endpoint: 'https://push.example/old', p256dh: 'p', auth: 'a' }),
      }),
    )
  })
})
