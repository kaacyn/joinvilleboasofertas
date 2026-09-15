/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Nuxt SSR não precacheia `/` nem `index.html`. Sem try/catch, Workbox
// lança `non-precached-url` e o SW não instala. O precache acima segue ok.
try {
  const handler = createHandlerBoundToURL('/')
  const route = new NavigationRoute(handler, {
    denylist: [/^\/api\//],
  })
  registerRoute(route)
}
catch {
  // ignore: navegação cai no SSR; o precache de assets permanece
}

self.addEventListener('install', () => {
  void self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

type PushPayload = {
  title?: string
  body?: string
  icon?: string
  tag?: string
  url?: string
  click_token?: string
  vibrate?: number[]
  renotify?: boolean
}

type NotificationData = {
  url?: string
  click_token?: string
}

/** Path relativo do payload vira URL absoluta na origem do JBO. */
function resolvePushUrl(url?: string): string {
  const origin = self.location.origin
  if (!url) return `${origin}/`
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const path = url.startsWith('/') ? url : `/${url}`
  return `${origin}${path}`
}

self.addEventListener('push', (event) => {
  let payload: PushPayload | null = null
  if (event.data) {
    try { payload = event.data.json() as PushPayload }
    catch { /* fallback visível abaixo */ }
  }
  event.waitUntil(handlePush(payload))
})

/** Chrome exige notificação visível em todo push. */
async function handlePush(payload: PushPayload | null) {
  const title = payload?.title || 'Joinville Boas Ofertas'
  const body = payload?.body || 'Você tem novas ofertas'
  await self.registration.showNotification(title, {
    body,
    icon: payload?.icon || '/pwa-192x192.png',
    tag: payload?.tag,
    renotify: Boolean(payload?.tag && payload?.renotify),
    data: {
      url: resolvePushUrl(payload?.url),
      click_token: payload?.click_token ?? '',
    },
    requireInteraction: false,
    vibrate: payload?.vibrate || [200, 100, 200],
  })
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = (event.notification.data || {}) as NotificationData
  event.waitUntil(reportClickThenOpen(data))
})

async function reportClickThenOpen(data: NotificationData) {
  if (data.click_token) {
    try {
      await fetch('/api/public/jbo/push/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.click_token }),
        keepalive: true,
      })
    }
    catch {
      // abrir URL mesmo se o POST falhar
    }
  }
  await focusOrOpen(resolvePushUrl(data.url))
}

async function focusOrOpen(url: string) {
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })
  for (const client of windowClients) {
    if ('focus' in client) {
      await client.focus()
      if ('navigate' in client) {
        await client.navigate(url)
        return
      }
    }
  }
  if (self.clients.openWindow) await self.clients.openWindow(url)
}
