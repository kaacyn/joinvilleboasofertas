import { jboGet, jboSend } from '~/utils/jboApi'

/** Converte a chave VAPID pública (base64url) em bytes para o PushManager. */
export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const b64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

let loadPromise: Promise<void> | null = null
const inFlight = new Map<string, Promise<void>>()
const SW_READY_MS = 4000

function detectPushSupport(): boolean {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && 'PushManager' in window
    && 'serviceWorker' in navigator
}

/** Registration atual, ou `ready` com timeout — `ready` sozinho nunca rejeita. */
async function getPushRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  const existing = await navigator.serviceWorker.getRegistration()
  if (existing) return existing
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), SW_READY_MS)
  })
  return Promise.race([navigator.serviceWorker.ready, timeout])
}

/**
 * Seguir loja no Web Push anônimo: VAPID + follows compartilhados entre cards.
 */
export function useJboStoreFollow() {
  const followedIds = useState<string[]>('jbo:followed-stores', () => [])
  const vapidKey = useState('jbo:vapid-public-key', () => '')
  const hint = useState('jbo:follow-hint', () => '')
  const hintFor = useState('jbo:follow-hint-for', () => '')
  const pushSupported = useState('jbo:push-supported', () => true)
  const { isIos, isStandalone } = usePwaInstall()

  function applyFollow(establishmentId: string, following: boolean) {
    if (following) {
      if (!followedIds.value.includes(establishmentId)) {
        followedIds.value = [...followedIds.value, establishmentId]
      }
      return
    }
    followedIds.value = followedIds.value.filter(id => id !== establishmentId)
  }

  async function loadOnce() {
    if (!import.meta.client) return
    if (!loadPromise) {
      loadPromise = (async () => {
        pushSupported.value = detectPushSupport()
        const vapid = await jboGet<{ public_key: string }>('/push/vapid-public-key')
        vapidKey.value = vapid.public_key || ''
        if (!pushSupported.value) return
        const endpoint = await currentEndpoint()
        if (!endpoint) return
        const q = await jboSend<{ establishment_ids: string[] }>(
          'POST',
          '/push/follows/query',
          { endpoint },
        )
        followedIds.value = q.establishment_ids || []
      })().catch(() => {
        loadPromise = null
      })
    }
    await loadPromise
  }

  onMounted(() => {
    void loadOnce()
  })

  function isFollowing(establishmentId: string): boolean {
    return followedIds.value.includes(establishmentId)
  }

  async function ensureSubscription(): Promise<PushSubscription> {
    await loadOnce()
    const reg = await getPushRegistration()
    if (!reg) throw new Error('Service worker indisponível')
    const existing = await reg.pushManager.getSubscription()
    if (existing) return existing
    let key = vapidKey.value
    if (!key) {
      const vapid = await jboGet<{ public_key: string }>('/push/vapid-public-key')
      key = vapid.public_key
      vapidKey.value = key
    }
    return reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    })
  }

  async function toggle(establishmentId: string): Promise<void> {
    hint.value = ''
    hintFor.value = establishmentId

    await loadOnce()

    if (!detectPushSupport()) {
      pushSupported.value = false
      hint.value = 'Para receber avisos no iPhone, instale o app na tela inicial.'
      return
    }

    if (isIos.value && !isStandalone.value) {
      hint.value = 'Para receber avisos no iPhone, instale o app na tela inicial.'
      return
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        hint.value = 'Permissão de notificação negada.'
        return
      }
    }

    const pending = inFlight.get(establishmentId)
    if (pending) {
      await pending
      return
    }

    const run = (async () => {
      const following = !followedIds.value.includes(establishmentId)
      try {
        const sub = await ensureSubscription()
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

        applyFollow(establishmentId, following)

        await jboSend('PUT', '/push/follows', {
          endpoint,
          establishment_id: establishmentId,
          following: following,
        })
      }
      catch {
        applyFollow(establishmentId, !following)
        if (!hint.value) hint.value = 'Não foi possível salvar. Tente de novo.'
      }
    })()

    inFlight.set(establishmentId, run)
    try {
      await run
    }
    finally {
      inFlight.delete(establishmentId)
    }
  }

  return {
    isFollowing,
    toggle,
    hint,
    hintFor,
    pushSupported,
  }
}

async function currentEndpoint(): Promise<string | null> {
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
