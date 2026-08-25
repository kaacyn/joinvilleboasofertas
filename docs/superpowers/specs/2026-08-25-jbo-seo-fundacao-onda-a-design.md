# SEO fundação JBO (onda A) — Design

**Data:** 2026-08-25  
**Repos:** `dev-joinvilleboasofertas` + `dev-snap-api` (`jbo_public`)  
**Fora:** `prd-*`, multi-cidade, hubs novos, conteúdo marketing novo na home

## Objetivo

Melhorar indexação em buscadores (Google/Bing) e descoberta por IAs (ex.: ChatGPT) com fundação técnica: meta completa, sitemap com `lastmod`, JSON-LD nas páginas-chave e `llms.txt`. Escopo geográfico permanece **Joinville**; paridade tipo [Tiendeo](https://www.tiendeo.com.br/) (multi-cidade, hubs ricos) fica para ondas futuras.

## Decisões

| Tema | Decisão |
|------|----------|
| Escopo | Onda A — fundação técnica apenas |
| Domínio canônico | `NUXT_PUBLIC_SITE_URL` de produção (um site público) |
| AI nesta onda | Infra: `llms.txt` + meta/JSON-LD bem formados; sem bloco novo de copy na home |
| FAQ | Reutilizar `/perguntas-frequentes` + schema `FAQPage` |
| `lastmod` | API popula; front emite no XML |
| Abordagem | Composable `useJboSeo` no Nuxt + ajustes em `sitemap.py` |

## Estado atual (resumo)

- SSR Nuxt, `robots.txt`, `sitemap.xml` dinâmico, titles em várias páginas.
- JSON-LD: `WebSite` (home), `Product`/`Offer` (produto).
- Lacunas: canonical/Twitter/OG incompletos; `lastmod` no schema API não preenchido; sem `FAQPage` / `LocalBusiness`; sem `llms.txt`; paths legados `/mercado` remapeados só no front.

## Arquitetura

### Front — `useJboSeo`

Arquivo: `app/composables/useJboSeo.ts` (ou equivalente no layout de composables do projeto).

Entrada:
- `title`, `description`
- `path` relativo canônico (sem query), ex. `/loja/foo`
- `image?` URL absoluta ou relativa resolvida contra `siteUrl`
- `jsonLd?` objeto ou array para `application/ld+json`

Comportamento:
- `useSeoMeta`: title, description, `ogTitle`, `ogDescription`, `ogUrl`, `ogImage`, `ogType` (`website` default; `article` só se explícito), Twitter `summary_large_image` (ou `summary` sem imagem)
- `useHead`: `link[rel=canonical]` = `{siteUrl}{path}`; script JSON-LD quando houver
- Se `siteUrl` vazio: não emitir URLs absolutas inválidas

Páginas a migrar: home, produto, encarte, loja, lojas, categoria, encartes, FAQ, envie-um-encarte, privacidade, termos.

### Front — `llms.txt`

`server/routes/llms.txt.ts`:
- Texto factual curto: o que é Joinville Boas Ofertas, escopo Joinville/região, não é e-commerce
- Links absolutos: `/`, `/lojas`, `/encartes`, `/perguntas-frequentes`
- `Content-Type: text/plain; charset=utf-8`

### Front — sitemap / robots

- `sitemap.xml.ts`: consumir `{ loc, lastmod? }`; emitir `<lastmod>` só se válido; manter filtro `/estabelecimentos` e remap `/mercado` → `/loja`; unir estáticos (`/lojas`, `/encartes`, FAQ, etc.; incluir `/envie-um-encarte` se indexável)
- `robots.txt`: `Allow: /` + `Sitemap: {siteUrl}/sitemap.xml` (sem bloquear crawlers de IA)

### API — `lastmod`

`apps/jbo_public/services/sitemap.py` + schema já existente `JboSitemapUrlSchema.lastmod`:

| `loc` | `lastmod` |
|-------|-----------|
| `/encarte/{id}` | `PhotoScan.updated_at` ou `created_at` |
| `/oferta/{id}`, `/produto/{slug}/{loja}` | timestamp do record/oferta vigente usado |
| `/produto/{slug}` | max das ofertas daquele produto no lote |
| `/loja/{slug}` (preferir path canônico; hoje `/mercado/`) | max das ofertas da loja no lote |
| `/categoria/{slug}` | max das ofertas da categoria no lote |
| `/` e listagens estáticas na API (se houver) | omitir ou data estável |

Formato: ISO date `YYYY-MM-DD` ou datetime W3C; inválido → omitir no XML (front).

Preferir emitir `/loja/{slug}` em vez de `/mercado/{slug}` na API; front mantém remap defensivo.

### JSON-LD

| Página | Schema |
|--------|--------|
| `/` | Manter `WebSite` + `SearchAction` |
| `/produto/...` | Manter `Product` + `Offer`; head via `useJboSeo` |
| `/perguntas-frequentes` | `FAQPage` espelhando Q&A já no template |
| `/loja/{slug}` | `LocalBusiness` com `name`, `address` (PostalAddress simples), `url`; `geo` só se lat/lng já existirem na resposta da página (senão omitir — sem expandir API nesta onda) |

## Degradação

- API sitemap indisponível → paths estáticos sem `lastmod`
- 404 → sem JSON-LD de entidade
- `lastmod` inválido → omitir tag

## Fora de escopo

- Multi-cidade / URLs por cidade
- Breadcrumbs UI / hubs novos estilo Tiendeo
- `changefreq` / `priority`
- Copy marketing novo na home
- Setup manual Search Console (apenas deixar o site pronto)
- Espelhar em `prd-snap-api` / `prd-joinvilleboasofertas`

## Testes

- API: amostra de URLs com `lastmod` não-nulo e formato ISO
- Front: composable gera canonical absoluto; sitemap com `<lastmod>` quando API envia; `GET /llms.txt` 200 + strings-chave; FAQ e loja com `application/ld+json`

## Critérios de sucesso

1. Páginas indexáveis com title, description, OG, Twitter e canonical absolutos no HTML SSR
2. `sitemap.xml` com `<lastmod>` nas URLs dinâmicas vindas da API
3. FAQ e loja com JSON-LD válido no SSR
4. `/llms.txt` público e factual
5. Sem regressão no redirect `/oferta/{id}` → produto×loja

## Ondas futuras (não implementar agora)

- Hubs e breadcrumbs; loja rica (mapa, horários)
- Conteúdo citável extra para LLMs
- Multi-cidade / expansão geográfica
