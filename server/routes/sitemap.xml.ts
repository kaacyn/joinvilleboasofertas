/**
 * Gera sitemap.xml a partir da API pública JBO.
 */
import { isValidLastmod } from '../../app/utils/jboSeo'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const site = String(config.public.siteUrl || '').replace(/\/$/, '')
  const apiBase = String(config.apiBase || '').replace(/\/$/, '')

  const entries = new Map<string, string | null>()
  for (const loc of [
    '/',
    '/radar-do-ovo',
    '/lojas',
    '/encartes',
    '/perguntas-frequentes',
    '/envie-um-encarte',
    '/privacidade',
    '/termos',
  ]) {
    entries.set(loc, null)
  }

  try {
    const data = await $fetch<{ urls: { loc: string, lastmod?: string | null }[] }>(
      `${apiBase}/api/public/jbo/sitemap`,
    )
    for (const u of data.urls || []) {
      const loc = u.loc.replace(/^\/mercado\//, '/loja/')
      if (loc === '/estabelecimentos') continue
      const lm = isValidLastmod(u.lastmod)
        ? u.lastmod!.trim().slice(0, 10)
        : null
      const prev = entries.get(loc) ?? null
      if (!entries.has(loc)) {
        entries.set(loc, lm)
      }
      else if (lm && (!prev || lm > prev)) {
        entries.set(loc, lm)
      }
    }
  }
  catch {
    // Mantém paths mínimos se a API estiver indisponível no build/SSR.
  }

  const urls = [...entries.entries()].map(([loc, lastmod]) => {
    const path = loc.startsWith('http') ? loc : `${site}${loc}`
    const lm = lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ''
    return `  <url><loc>${escapeXml(path)}</loc>${lm}</url>`
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
