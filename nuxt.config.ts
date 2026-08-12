// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/css/tokens.css'],
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
})
