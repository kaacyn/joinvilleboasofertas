# SEO fundação JBO (onda A) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar meta (canonical/OG/Twitter), sitemap com `lastmod`, JSON-LD FAQ/loja e `llms.txt` para indexação e descoberta por IAs.

**Architecture:** API `build_sitemap_urls()` passa a emitir `lastmod` + paths `/loja/`. Front ganha `useJboSeo` + helpers puros; sitemap Nitro emite `<lastmod>`; rota `/llms.txt`; páginas migradas; FAQPage e LocalBusiness no SSR.

**Tech Stack:** Nuxt 3/4 + Vitest (`dev-joinvilleboasofertas`); Django Ninja + pytest (`dev-snap-api`)

**Spec:** `docs/superpowers/specs/2026-08-25-jbo-seo-fundacao-onda-a-design.md`

## Global Constraints

- Onda A apenas (sem multi-cidade, breadcrumbs UI, hubs novos, copy marketing novo na home)
- Domínio canônico = `NUXT_PUBLIC_SITE_URL` (produção no deploy)
- Reutilizar FAQ existente em `/perguntas-frequentes`
- Não espelhar `prd-*` neste ciclo
- Preservar WIP; stage só arquivos da feature
- Work from: `/root/Docker/projetos/dev-snap-api` (Task 1) e `/root/Docker/projetos/dev-joinvilleboasofertas` (Tasks 2–4)
- Sem `changefreq` / `priority`
- Não bloquear GPTBot / crawlers de IA

## File map

| File | Role |
|------|------|
| `dev-snap-api/apps/jbo_public/services/sitemap.py` | `lastmod` + loc `/loja/` |
| `dev-snap-api/tests/jbo_public/test_catalog_api.py` | Asserts lastmod + `/loja/` |
| `dev-joinvilleboasofertas/app/utils/jboSeo.ts` | Helpers puros: absoluteUrl, resolveImage, isValidLastmod |
| `dev-joinvilleboasofertas/app/composables/useJboSeo.ts` | Meta + canonical + JSON-LD |
| `dev-joinvilleboasofertas/app/pages/*.vue` | Migrar para `useJboSeo` + schemas |
| `dev-joinvilleboasofertas/server/routes/sitemap.xml.ts` | Emitir `<lastmod>` |
| `dev-joinvilleboasofertas/server/routes/llms.txt.ts` | Texto factual |
| `dev-joinvilleboasofertas/tests/jboSeo.spec.ts` | Unit helpers |
| `dev-joinvilleboasofertas/tests/seoFoundation.spec.ts` | Smoke source/strings |

---

### Task 1: API sitemap com `lastmod` e `/loja/`

**Files:**
- Modify: `dev-snap-api/apps/jbo_public/services/sitemap.py`
- Modify: `dev-snap-api/tests/jbo_public/test_catalog_api.py`
- Schema: `JboSitemapUrlSchema.lastmod` já existe — não alterar contrato além de popular

**Interfaces:**
- Produces: `build_sitemap_urls() -> list[dict]` com chaves `loc: str` e `lastmod: str | None` (`YYYY-MM-DD` UTC date da fonte)
- Encarte: `PhotoScan.created_at` (modelo sem `updated_at`)
- Oferta/produto×loja: `PriceRecord.recorded_at`
- Agregados loja/categoria/produto-slug: `max(recorded_at)` dos records usados no lote
- Preferir `loc` `/loja/{slug}` (não `/mercado/{slug}`)

- [ ] **Step 1: Estender o teste existente (RED)**

Em `test_sitemap_includes_product_and_offer_paths`, além dos `loc`, assert:

```python
    urls = {u["loc"]: u for u in r.json()["urls"]}
    offer_u = urls[f"/oferta/{rec.id}"]
    assert offer_u.get("lastmod")
    assert len(offer_u["lastmod"]) >= 10  # YYYY-MM-DD…
    prod_loja = f"/produto/{prod.slug}/{est.slug}"
    assert urls[prod_loja].get("lastmod")
    assert f"/loja/{est.slug}" in urls
    assert f"/mercado/{est.slug}" not in urls
```

- [ ] **Step 2: RED**

```bash
cd /root/Docker/projetos/dev-snap-api
docker compose --env-file .env --env-file .env.loc --env-file .env.compose exec -T snap-api \
  pytest tests/jbo_public/test_catalog_api.py::test_sitemap_includes_product_and_offer_paths -q
```

Expected: FAIL (`lastmod` ausente e/ou ainda `/mercado/`)

- [ ] **Step 3: Implementar `sitemap.py`**

```python
"""URLs canônicas para sitemap da plataforma JBO."""
from datetime import datetime, timezone

from apps.jbo_public.services.encartes import eligible_encartes_qs
from apps.jbo_public.services.offers import _latest_per_product_establishment
from apps.jbo_public.scope import jbo_visible_records


def _lastmod_date(dt) -> str | None:
    if dt is None:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.utc) if hasattr(timezone, "make_aware") else dt
    # Prefer django.utils.timezone; fallback:
    if isinstance(dt, datetime):
        return dt.astimezone(timezone.utc).date().isoformat()
    return None


def build_sitemap_urls() -> list[dict]:
    urls: list[dict] = [{"loc": "/", "lastmod": None}]
    for scan in eligible_encartes_qs():
        urls.append({
            "loc": f"/encarte/{scan.id}",
            "lastmod": _lastmod_date(scan.created_at),
        })

    seen_products: set[str] = set()
    market_max: dict[str, datetime] = {}
    category_max: dict[str, datetime] = {}
    product_max: dict[str, datetime] = {}

    qs = _latest_per_product_establishment(jbo_visible_records())
    # garantir recorded_at / relations no iterator (select_related se necessário)
    for rec in qs:
        lm = rec.recorded_at
        urls.append({"loc": f"/oferta/{rec.id}", "lastmod": _lastmod_date(lm)})
        pslug = rec.product.slug
        eslug = rec.establishment.slug
        if pslug and eslug:
            urls.append({
                "loc": f"/produto/{pslug}/{eslug}",
                "lastmod": _lastmod_date(lm),
            })
        if pslug:
            prev = product_max.get(pslug)
            if prev is None or (lm and lm > prev):
                product_max[pslug] = lm
        if eslug:
            prev = market_max.get(eslug)
            if prev is None or (lm and lm > prev):
                market_max[eslug] = lm
        cat = rec.product.category
        if cat and cat.slug:
            prev = category_max.get(cat.slug)
            if prev is None or (lm and lm > prev):
                category_max[cat.slug] = lm

    for pslug, lm in product_max.items():
        urls.append({"loc": f"/produto/{pslug}", "lastmod": _lastmod_date(lm)})
    for eslug, lm in market_max.items():
        urls.append({"loc": f"/loja/{eslug}", "lastmod": _lastmod_date(lm)})
    for cslug, lm in category_max.items():
        urls.append({"loc": f"/categoria/{cslug}", "lastmod": _lastmod_date(lm)})
    return urls
```

Usar `django.utils.timezone` corretamente em `_lastmod_date` (corrigir o rascunho acima na implementação: import de `django.utils.timezone as dj_tz` + `timezone.utc` de `datetime`). Remover entrada legada `/estabelecimentos` da API se ainda existir.

- [ ] **Step 4: GREEN**

```bash
docker compose --env-file .env --env-file .env.loc --env-file .env.compose exec -T snap-api \
  pytest tests/jbo_public/test_catalog_api.py::test_sitemap_includes_product_and_offer_paths -q
```

Expected: PASS

- [ ] **Step 5: Commit (só arquivos da task)**

```bash
cd /root/Docker/projetos/dev-snap-api
git add apps/jbo_public/services/sitemap.py tests/jbo_public/test_catalog_api.py
git commit -m "$(cat <<'EOF'
feat: sitemap JBO com lastmod e paths /loja

EOF
)"
```

---

### Task 2: Helpers `jboSeo` + composable `useJboSeo`

**Files:**
- Create: `dev-joinvilleboasofertas/app/utils/jboSeo.ts`
- Create: `dev-joinvilleboasofertas/app/composables/useJboSeo.ts`
- Create: `dev-joinvilleboasofertas/tests/jboSeo.spec.ts`

**Interfaces:**
- Produces:
  - `absoluteUrl(siteUrl: string, path: string): string`
  - `resolveOgImage(siteUrl: string, image?: string | null): string | undefined`
  - `isValidLastmod(value: unknown): value is string` — aceita `YYYY-MM-DD` ou datetime ISO prefix
  - `useJboSeo(opts: { title, description, path, image?, jsonLd?, ogType? })`

- [ ] **Step 1: Teste RED dos helpers**

```typescript
import { describe, expect, it } from 'vitest'
import { absoluteUrl, isValidLastmod, resolveOgImage } from '../app/utils/jboSeo'

describe('jboSeo helpers', () => {
  it('absoluteUrl junta site e path sem barra dupla', () => {
    expect(absoluteUrl('https://ex.com/', '/loja/a')).toBe('https://ex.com/loja/a')
    expect(absoluteUrl('https://ex.com', 'loja/a')).toBe('https://ex.com/loja/a')
  })

  it('absoluteUrl vazio se siteUrl vazio', () => {
    expect(absoluteUrl('', '/x')).toBe('')
  })

  it('resolveOgImage aceita absoluta e relativa', () => {
    expect(resolveOgImage('https://ex.com', 'https://cdn/x.jpg')).toBe('https://cdn/x.jpg')
    expect(resolveOgImage('https://ex.com', '/assets/a.png')).toBe('https://ex.com/assets/a.png')
    expect(resolveOgImage('https://ex.com', null)).toBeUndefined()
  })

  it('isValidLastmod', () => {
    expect(isValidLastmod('2026-08-25')).toBe(true)
    expect(isValidLastmod('2026-08-25T12:00:00Z')).toBe(true)
    expect(isValidLastmod('nope')).toBe(false)
    expect(isValidLastmod(null)).toBe(false)
  })
})
```

- [ ] **Step 2: RED**

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
npm test -- tests/jboSeo.spec.ts
```

Expected: FAIL (módulo inexistente)

- [ ] **Step 3: Implementar `app/utils/jboSeo.ts`**

```typescript
export function absoluteUrl(siteUrl: string, path: string): string {
  const base = String(siteUrl || '').replace(/\/$/, '')
  if (!base) return ''
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

export function resolveOgImage(
  siteUrl: string,
  image?: string | null,
): string | undefined {
  if (!image) return undefined
  if (/^https?:\/\//i.test(image)) return image
  return absoluteUrl(siteUrl, image) || undefined
}

export function isValidLastmod(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false
  return /^\d{4}-\d{2}-\d{2}/.test(value.trim())
}
```

- [ ] **Step 4: Implementar `app/composables/useJboSeo.ts`**

```typescript
import { absoluteUrl, resolveOgImage } from '~/utils/jboSeo'

type JboSeoOpts = {
  title: string | (() => string)
  description: string | (() => string)
  path: string | (() => string)
  image?: string | null | (() => string | null | undefined)
  jsonLd?: Record<string, unknown> | Record<string, unknown>[] | (() => Record<string, unknown> | Record<string, unknown>[] | null | undefined)
  ogType?: string
}

export function useJboSeo(opts: JboSeoOpts) {
  const config = useRuntimeConfig()
  const site = String(config.public.siteUrl || '').replace(/\/$/, '')

  const resolve = <T>(v: T | (() => T)): T =>
    typeof v === 'function' ? (v as () => T)() : v

  useSeoMeta({
    title: () => resolve(opts.title),
    description: () => resolve(opts.description),
    ogTitle: () => resolve(opts.title),
    ogDescription: () => resolve(opts.description),
    ogUrl: () => {
      if (!site) return undefined
      return absoluteUrl(site, resolve(opts.path)) || undefined
    },
    ogImage: () => {
      const img = opts.image === undefined ? undefined : resolve(opts.image as any)
      return resolveOgImage(site, img ?? null)
    },
    ogType: opts.ogType || 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: () => resolve(opts.title),
    twitterDescription: () => resolve(opts.description),
    twitterImage: () => {
      const img = opts.image === undefined ? undefined : resolve(opts.image as any)
      return resolveOgImage(site, img ?? null)
    },
  })

  useHead(() => {
    const path = resolve(opts.path)
    const canonical = site ? absoluteUrl(site, path) : ''
    const ld = opts.jsonLd === undefined ? null : resolve(opts.jsonLd as any)
    const head: Record<string, unknown> = {}
    if (canonical) {
      head.link = [{ rel: 'canonical', href: canonical }]
    }
    if (ld) {
      head.script = [
        {
          type: 'application/ld+json',
          children: JSON.stringify(ld),
        },
      ]
    }
    return head
  })
}
```

(Ajustar tipagem fina se o linter do projeto exigir; manter comportamento.)

- [ ] **Step 5: GREEN**

```bash
npm test -- tests/jboSeo.spec.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/utils/jboSeo.ts app/composables/useJboSeo.ts tests/jboSeo.spec.ts
git commit -m "$(cat <<'EOF'
feat: useJboSeo com canonical OG e Twitter

EOF
)"
```

---

### Task 3: Migrar páginas + FAQPage + LocalBusiness

**Files:**
- Modify: `app/pages/index.vue`
- Modify: `app/pages/produto/[slug]/[[loja]].vue`
- Modify: `app/pages/encarte/[id].vue`
- Modify: `app/pages/loja/[slug].vue`
- Modify: `app/pages/lojas.vue`
- Modify: `app/pages/categoria/[slug].vue`
- Modify: `app/pages/encartes.vue`
- Modify: `app/pages/perguntas-frequentes.vue`
- Modify: `app/pages/envie-um-encarte.vue`
- Modify: `app/pages/privacidade.vue`
- Modify: `app/pages/termos.vue`
- Modify: `tests/perguntasFrequentesPage.spec.ts`
- Modify: `tests/encartesPage.spec.ts` (trocar expect `useSeoMeta` → `useJboSeo` se houver)
- Create: `tests/seoFoundation.spec.ts` (smoke)

**Interfaces:**
- Consumes: `useJboSeo` da Task 2
- FAQ: extrair array `{ question, answer }` no script (mesmos textos do template) → JSON-LD `FAQPage`
- Loja: `LocalBusiness` com name, address, url; sem geo se lat/lng não estiverem na resposta

- [ ] **Step 1: Smoke RED**

```typescript
// tests/seoFoundation.spec.ts
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
    ]) {
      expect(src(p)).toContain('useJboSeo')
    }
  })

  it('FAQ e loja declaram schema.org', () => {
    expect(src('app/pages/perguntas-frequentes.vue')).toContain('FAQPage')
    expect(src('app/pages/loja/[slug].vue')).toContain('LocalBusiness')
  })

  it('llms.txt route existe', () => {
    expect(src('server/routes/llms.txt.ts')).toContain('Joinville Boas Ofertas')
  })
})
```

(Nota: `llms.txt` ainda não existe — Task 4; neste step só as asserts de páginas, **ou** deixar o assert de llms para Task 4. Preferir neste step só páginas/FAQ/loja.)

Ajustar o arquivo de teste da Task 3 **sem** a assert de `llms.txt`; Task 4 acrescenta.

- [ ] **Step 2: RED** `npm test -- tests/seoFoundation.spec.ts`

- [ ] **Step 3: Migrar páginas**

Padrão estático (FAQ):

```typescript
const faqEntities = [
  {
    question: 'O que é o Joinville Boas Ofertas?',
    answer: 'Um catálogo público de ofertas de lojas de Joinville e região. Você compara preços e vê trechos de encartes — sem comprar pelo site.',
  },
  // … demais Q&A iguais ao template (compradores + lojas)
]

useJboSeo({
  title: 'Perguntas frequentes | Joinville Boas Ofertas',
  description: 'Dúvidas frequentes para quem compra e para lojas no Joinville Boas Ofertas.',
  path: '/perguntas-frequentes',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqEntities.map(e => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: { '@type': 'Answer', text: e.answer },
    })),
  },
})
```

Loja:

```typescript
useJboSeo({
  title: () => data.value
    ? `Ofertas em ${data.value.establishment.name} | Joinville`
    : 'Loja',
  description: () => data.value
    ? `Preços vigentes em ${data.value.establishment.name}, Joinville.`
    : '',
  path: () => `/loja/${slug.value}`,
  image: () => data.value?.establishment.logo_url,
  jsonLd: () => {
    if (!data.value) return null
    const est = data.value.establishment
    const config = useRuntimeConfig()
    const site = String(config.public.siteUrl || '').replace(/\/$/, '')
    return {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: est.name,
      url: `${site}/loja/${est.slug}`,
      address: est.address
        ? { '@type': 'PostalAddress', streetAddress: est.address, addressLocality: 'Joinville', addressCountry: 'BR' }
        : undefined,
    }
  },
})
```

Home: passar `path: '/'` e `jsonLd` WebSite (mover do `useHead` atual).  
Produto: `path` = path canônico atual (`productOfferPath` ou `/produto/slug`); manter Product JSON-LD via `jsonLd` reativo.  
Demais páginas: title/desc existentes + `path` fixo.

Atualizar testes source que checam `useSeoMeta` → `useJboSeo`.

- [ ] **Step 4: GREEN** `npm test -- tests/seoFoundation.spec.ts tests/perguntasFrequentesPage.spec.ts tests/encartesPage.spec.ts`

- [ ] **Step 5: Commit**

```bash
git add app/pages/ tests/seoFoundation.spec.ts tests/perguntasFrequentesPage.spec.ts tests/encartesPage.spec.ts
git commit -m "$(cat <<'EOF'
feat: meta SEO e JSON-LD FAQ/loja nas páginas JBO

EOF
)"
```

---

### Task 4: Sitemap Nitro `lastmod` + `llms.txt`

**Files:**
- Modify: `server/routes/sitemap.xml.ts`
- Create: `server/routes/llms.txt.ts`
- Modify: `tests/seoFoundation.spec.ts` (assert llms + lastmod no handler)

**Interfaces:**
- Consumes: API `{ urls: { loc, lastmod? }[] }`
- Produces: XML com `<lastmod>` quando `isValidLastmod`; estáticos sem lastmod; incluir `/envie-um-encarte` na lista estática

- [ ] **Step 1: Ampliar smoke (RED se faltarem strings)**

```typescript
  it('sitemap emite lastmod e llms existe', () => {
    const sm = src('server/routes/sitemap.xml.ts')
    expect(sm).toContain('lastmod')
    expect(sm).toContain('isValidLastmod')
    expect(sm).toContain('/envie-um-encarte')
    expect(src('server/routes/llms.txt.ts')).toContain('Joinville Boas Ofertas')
    expect(src('server/routes/llms.txt.ts')).toContain('/perguntas-frequentes')
  })
```

- [ ] **Step 2: RED** `npm test -- tests/seoFoundation.spec.ts`

- [ ] **Step 3: Atualizar `sitemap.xml.ts`**

```typescript
import { isValidLastmod } from '../../app/utils/jboSeo'

// fetch tipado:
const data = await $fetch<{ urls: { loc: string; lastmod?: string | null }[] }>(...)

// merge paths: manter Map loc -> lastmod
const entries = new Map<string, string | null>()
for (const loc of ['/', '/lojas', '/encartes', '/perguntas-frequentes', '/envie-um-encarte', '/privacidade', '/termos']) {
  entries.set(loc, null)
}
for (const u of fromApi) {
  const loc = u.loc.replace(/^\/mercado\//, '/loja/')
  if (loc === '/estabelecimentos') continue
  const prev = entries.get(loc)
  const lm = isValidLastmod(u.lastmod) ? u.lastmod.trim().slice(0, 10) : null
  // se já tinha lastmod e novo também, ficar com o mais recente string-compare ISO ok
  if (!entries.has(loc) || (lm && (!prev || lm > prev))) {
    entries.set(loc, lm ?? prev ?? null)
  }
}

const urls = [...entries.entries()].map(([loc, lastmod]) => {
  const path = loc.startsWith('http') ? loc : `${site}${loc}`
  const lm = lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ''
  return `  <url><loc>${escapeXml(path)}</loc>${lm}</url>`
})
```

- [ ] **Step 4: Criar `llms.txt.ts`**

```typescript
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
    `- Lojas: ${site}/lojas`,
    `- Encartes: ${site}/encartes`,
    `- Perguntas frequentes: ${site}/perguntas-frequentes`,
    '',
  ].join('\n')
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return body
})
```

- [ ] **Step 5: GREEN** `npm test -- tests/seoFoundation.spec.ts tests/jboSeo.spec.ts`

- [ ] **Step 6: Commit**

```bash
git add server/routes/sitemap.xml.ts server/routes/llms.txt.ts tests/seoFoundation.spec.ts
git commit -m "$(cat <<'EOF'
feat: sitemap lastmod e llms.txt no JBO

EOF
)"
```

- [ ] **Step 7: Deploy loc (quando pedido)**

Rebuild/restart do front JBO; API já com Task 1. Verificar manualmente:
- `GET {site}/sitemap.xml` contém `<lastmod>`
- `GET {site}/llms.txt`
- View-source de `/perguntas-frequentes` e `/loja/...` com `ld+json` e `rel=canonical`

---

## Self-review (plan vs spec)

| Spec | Task |
|------|------|
| useJboSeo canonical/OG/Twitter | Task 2–3 |
| lastmod API → XML | Task 1 + 4 |
| FAQPage | Task 3 |
| LocalBusiness | Task 3 |
| llms.txt | Task 4 |
| paths `/loja`, sem prioridade/changefreq | Task 1 + 4 |
| Sem prd / sem multi-cidade | Constraints |
| Degradação API down | Task 4 (estáticos) |

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-25-jbo-seo-fundacao-onda-a.md`. Two execution options:

**1. Subagent-Driven (recommended)** — subagente fresco por task + review entre tasks  
**2. Inline Execution** — executar nesta sessão com checkpoints  

Which approach?
