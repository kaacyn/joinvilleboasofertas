/**
 * llms.txt — resumo factual para crawlers / assistentes de IA.
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const site = String(config.public.siteUrl || '').replace(/\/$/, '')
  const body = [
    '# Joinville Boas Ofertas',
    '',
    'Catálogo público de ofertas e encartes de supermercados em Joinville e região (Brasil).',
    'Não é e-commerce: não vende nem entrega produtos; a compra é na loja.',
    '',
    '## Links',
    `- Home: ${site}/`,
    `- Radar do ovo (onde comprar ovos hoje): ${site}/radar-do-ovo`,
    `- Lojas: ${site}/lojas`,
    `- Encartes: ${site}/encartes`,
    `- Perguntas frequentes: ${site}/perguntas-frequentes`,
    '',
  ].join('\n')
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return body
})
