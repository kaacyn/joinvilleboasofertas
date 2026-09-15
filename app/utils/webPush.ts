/** Web Push anônimo do JBO: suporte, permissão, inscrição e dispositivo no snap-api. */

import { jboGet, jboSend } from '~/utils/jboApi'

const SW_READY_MS = 4000

export const PUSH_HINT_INSTALL_IOS = 'Para receber avisos no iPhone, instale o app na tela inicial.'
export const PUSH_HINT_DENIED = 'Permissão de notificação negada.'

export type FollowInstructionMode =
  | 'ios-install'
  | 'request-permission'
  | 'permission-denied'
  | 'ready'

export type PushReady = { ok: true, endpoint: string } | { ok: false, hint: string }

let vapidKey = ''

/** Converte a chave VAPID pública (base64url) em bytes para o PushManager. */
export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const b64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

/** True quando o navegador tem Notification, PushManager e service worker. */
export function detectPushSupport(): boolean {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && 'PushManager' in window
    && 'serviceWorker' in navigator
}

/** Registration atual, ou `ready` com timeout — `ready` sozinho nunca rejeita. */
export async function getPushRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  const existing = await navigator.serviceWorker.getRegistration()
  if (existing) return existing
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), SW_READY_MS)
  })
  return Promise.race([navigator.serviceWorker.ready, timeout])
}

/** Endpoint da inscrição push atual; null sem inscrição ou sem service worker. */
export async function currentPushEndpoint(): Promise<string | null> {
  try {
    const reg = await getPushRegistration()
    if (!reg) return null
    const sub = await reg.pushManager.getSubscription()
    return sub?.endpoint || null
  }
  catch {
    return null
  }
}

/** Define o passo a passo conforme plataforma e permissão atual do navegador. */
export function followInstructionMode(
  isIos: boolean,
  isStandalone: boolean,
): FollowInstructionMode {
  if (typeof window === 'undefined') return 'request-permission'
  if (!detectPushSupport() || (isIos && !isStandalone)) return 'ios-install'
  if (Notification.permission === 'denied') return 'permission-denied'
  if (Notification.permission === 'default') return 'request-permission'
  return 'ready'
}

/** Chave VAPID pública do snap-api (uma busca por sessão). */
async function publicVapidKey(): Promise<string> {
  if (!vapidKey) {
    const vapid = await jboGet<{ public_key: string }>('/push/vapid-public-key')
    vapidKey = vapid.public_key || ''
  }
  return vapidKey
}

/**
 * Garante permissão, inscrição e dispositivo registrado no snap-api.
 * Checa suporte e iPhone fora do app antes de pedir permissão; devolve o
 * endpoint ou o recado para a tela. Falha de rede/SW sobe como exceção.
 */
export async function ensurePushDevice(isIos: boolean, isStandalone: boolean): Promise<PushReady> {
  if (!detectPushSupport() || (isIos && !isStandalone)) {
    return { ok: false, hint: PUSH_HINT_INSTALL_IOS }
  }
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, hint: PUSH_HINT_DENIED }
  }
  const reg = await getPushRegistration()
  if (!reg) throw new Error('Service worker indisponível')
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(await publicVapidKey()),
    })
  }
  const json = sub.toJSON()
  const endpoint = json.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!endpoint || !p256dh || !auth) throw new Error('incomplete')
  await jboSend('PUT', '/push/devices', {
    endpoint,
    p256dh,
    auth,
    user_agent: navigator.userAgent,
  })
  return { ok: true, endpoint }
}
