/**
 * robots.txt dinâmico com sitemap do domínio canônico.
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const site = String(config.public.siteUrl || '').replace(/\/$/, '')
  const body = [
    'User-agent: *',
    'Allow: /',
    `Sitemap: ${site}/sitemap.xml`,
    '',
  ].join('\n')
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return body
})
