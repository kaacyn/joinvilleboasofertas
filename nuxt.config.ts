// https://nuxt.com/docs/api/configuration/nuxt-config
const publicSiteUrl = process.env.NUXT_PUBLIC_SITE_URL || ''
const locPwaDev = Boolean(publicSiteUrl) && !/localhost|127\.0\.0\.1/.test(publicSiteUrl)
const pwaNavigation = {
  denylist: ['/api/'],
}

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
        { name: 'theme-color', content: '#0D131D' },
        {
          name: 'description',
          content: 'Ofertas de supermercados em Joinville e região.',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/assets/favicon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&display=swap',
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
    srcDir: 'app',
    filename: 'sw.ts',
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    registerWebManifestInRouteRules: true,
    includeAssets: ['assets/favicon.png'],
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      navigateFallbackDenylist: pwaNavigation.denylist.map((path) => new RegExp(`^${path}`)),
    },
    manifest: {
      name: 'Joinville Boas Ofertas',
      short_name: 'JBO',
      description: 'Ofertas de supermercados em Joinville e região.',
      lang: 'pt-BR',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#0D131D',
      theme_color: '#0D131D',
    },
    devOptions: {
      enabled: locPwaDev,
      type: 'module',
      navigateFallback: '/',
    },
  },
})
