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
