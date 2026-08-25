import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const src = (p: string) => readFileSync(resolve(root, p), 'utf8')

describe('SEO fundação onda A', () => {
  it('páginas usam useJboSeo', () => {
    for (const p of [
      'app/pages/index.vue',
      'app/pages/loja/[slug].vue',
      'app/pages/perguntas-frequentes.vue',
      'app/pages/produto/[slug]/[[loja]].vue',
      'app/pages/encarte/[id].vue',
      'app/pages/encartes.vue',
      'app/pages/lojas.vue',
      'app/pages/categoria/[slug].vue',
    ]) {
      expect(src(p)).toContain('useJboSeo')
    }
  })

  it('FAQ e loja declaram schema.org', () => {
    expect(src('app/pages/perguntas-frequentes.vue')).toContain('FAQPage')
    expect(src('app/pages/loja/[slug].vue')).toContain('LocalBusiness')
  })

  it('sitemap emite lastmod e llms existe', () => {
    const sm = src('server/routes/sitemap.xml.ts')
    expect(sm).toContain('lastmod')
    expect(sm).toContain('isValidLastmod')
    expect(sm).toContain('/envie-um-encarte')
    expect(src('server/routes/llms.txt.ts')).toContain('Joinville Boas Ofertas')
    expect(src('server/routes/llms.txt.ts')).toContain('/perguntas-frequentes')
  })
})
