// https://nuxt.com/docs/api/configuration/nuxt-config
const publicSiteUrl = process.env.NUXT_PUBLIC_SITE_URL || ''
const locPwaDev = Boolean(publicSiteUrl) && !/localhost|127\.0\.0\.1/.test(publicSiteUrl)

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@vite-pwa/nuxt'],
  css: ['~/assets/css/tokens.css'],
  components: [
    { path: '~/components', pathPrefix: false },
  ],
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Joinville Boas Ofertas',
      meta: [
        { name: 'theme-color', content: '#F3F4F6' },
        {
          name: 'description',
          content: 'Ofertas de supermercados em Joinville e região.',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/assets/favicon.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@700;800;900&display=swap',
        },
      ],
    },
  },
  runtimeConfig: {
    /** Base interna para SSR (rede Docker → snap-api). */
    apiBase: process.env.NUXT_API_BASE || 'http://snap-api-dev:8000',
    public: {
      siteUrl:
        process.env.NUXT_PUBLIC_SITE_URL
        || 'https://joinvilleboasofertas-loc-app.cacin.dev',
    },
  },
  pwa: {
    strategies: 'injectManifest',
    srcDir: '.',
    filename: 'sw.ts',
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    registerWebManifestInRouteRules: true,
    includeAssets: ['assets/favicon.png', 'apple-touch-icon.png'],
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
    },
    manifest: {
      name: 'Joinville Boas Ofertas',
      short_name: 'Joinville Boas Ofertas',
      description: 'Ofertas de supermercados em Joinville e região.',
      lang: 'pt-BR',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#F3F4F6',
      theme_color: '#F3F4F6',
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    devOptions: {
      enabled: locPwaDev,
      type: 'module',
      navigateFallback: '/',
    },
  },
})
