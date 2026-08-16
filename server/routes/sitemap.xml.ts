
/**
 * Gera sitemap.xml a partir da API pública JBO.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const site = String(config.public.siteUrl || '').replace(/\/$/, '')
  const apiBase = String(config.apiBase || '').replace(/\/$/, '')

  let paths: string[] = ['/', '/lojas', '/encartes', '/privacidade', '/termos']
  try {
    const data = await $fetch<{ urls: { loc: string }[] }>(
      `${apiBase}/api/public/jbo/sitemap`,
    )
    const fromApi = (data.urls || [])
      .filter(u => u.loc !== '/estabelecimentos')
      .map(u => u.loc.replace(/^\/mercado\//, '/loja/'))
    paths = [
      ...new Set([
        '/',
        '/lojas',
        '/encartes',
        '/privacidade',
        '/termos',
        ...fromApi,
      ]),
    ]
  }
  catch {
    // Mantém paths mínimos se a API estiver indisponível no build/SSR.
  }

  const urls = paths.map((loc) => {
    const path = loc.startsWith('http') ? loc : `${site}${loc}`
    return `  <url><loc>${escapeXml(path)}</loc></url>`
  })

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
  ].join('\n')

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return xml
})

/**
 * Escapa caracteres especiais em XML.
 */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
