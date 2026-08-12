# JBO Nuxt Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a waiting page estática do repo `joinvilleboasofertas` por um app Nuxt 3 SSR com home (busca/filtro/lista), páginas de oferta/produto/mercado/categoria, identidade visual JBO e SEO.

**Architecture:** Nuxt 3 (Vue 3) no container; nginx faz reverse proxy para o Node Nuxt e mantém `/api/` → `snap-api-dev`. Consome apenas `/api/public/jbo/*` (same-origin). Sem auth.

**Tech Stack:** Nuxt 3, Vue 3, Vitest, Docker, nginx.

**Spec:** `docs/superpowers/specs/2026-08-12-jbo-plataforma-publica-design.md`

**Depends on:** plano `dev-snap-api/docs/superpowers/plans/2026-08-12-jbo-public-api.md` (endpoints + slugs).

## Global Constraints

- Design tokens da waiting page: `--navy #0D131D`, `--yellow #FFC800`, `--red #E61E25`, Montserrat, logo existente em `site/assets`
- Sem login, foto, listas, histórico, CEP/GPS
- Comentários JSDoc em português nas funções; imports no topo
- Worktree: `dev-joinvilleboasofertas`, branch `develop`
- Commits só quando o usuário pedir
- Produção (`prd` / `main`) fora deste plano

---

## File map

| Path | Responsibility |
| --- | --- |
| `package.json`, `nuxt.config.ts`, `tsconfig.json` | Scaffold Nuxt |
| `app.vue`, `assets/css/tokens.css` | Shell + design tokens |
| `components/AppHeader.vue` | Logo + slot de busca |
| `components/offers/OfferCard.vue` | Card da listagem |
| `components/offers/FilterBar.vue`, `FiltersSheet.vue` | Filtros (UX Snap) |
| `components/offers/SearchBar.vue` | Busca `q` |
| `composables/useOffersFeed.ts` | Paginação cursor |
| `composables/useOfferFilters.ts` | Estado filtros ↔ query |
| `server/api/...` ou `utils/api.ts` | Client HTTP relativo `/api/public/jbo` |
| `pages/index.vue` | Home SSR |
| `pages/oferta/[id].vue` | Detalhe oferta |
| `pages/produto/[slug].vue` | Hub produto + cheapest |
| `pages/mercado/[slug].vue` | Ofertas do mercado |
| `pages/categoria/[slug].vue` | Ofertas da categoria |
| `pages/privacidade.vue` | Política migrada |
| `server/routes/robots.txt.ts`, `sitemap.xml.ts` | SEO files |
| `Dockerfile`, `Dockerfile.dev`, `docker-compose.yml` | Node + nginx |
| `nginx/default.conf` | Proxy Nuxt + `/api` |
| `README.md` | Setup develop |
| `tests/...` | Vitest smoke |

Estrutura sugerida após migração (remover HTML estático da home):

```text
joinvilleboasofertas/
  app/ ou pages/   (Nuxt)
  public/assets/   (logo, favicon — mover de site/assets)
  nginx/
  Dockerfile
  docker-compose.yml
  docs/
```

---

### Task 1: Scaffold Nuxt + Docker/nginx

**Files:**
- Create: scaffold Nuxt 3 (`nuxi init` ou arquivos manuais)
- Modify: `Dockerfile`, `docker-compose.yml`, `nginx/default.conf`
- Modify: `.env.example` se precisar de `NUXT_*`
- Move: `site/assets/*` → `public/assets/`
- Keep: conteúdo de privacidade para Task 4

**Interfaces:**
- Produz app que sobe em `:3000` internamente; nginx `:80` → Nuxt; `/api/` → `snap-api-dev:8000`
- Health: `GET /health` no nginx continua `200 ok`

- [ ] **Step 1: Criar app Nuxt mínimo**

Na raiz de `dev-joinvilleboasofertas` (ou subpasta `web/` se preferir raiz limpa — **preferir raiz do repo** substituindo `site/`):

```bash
# Exemplo — ajustar se nuxi não estiver global:
npm create nuxt@latest . -- -t minimal --packageManager npm --no-modules
```

Se o diretório não estiver vazio, criar em `app-tmp` e mover `package.json`, `nuxt.config.ts`, `app.vue`, `pages/`, etc. para a raiz; arquivar `site/index.html` (pode deletar a waiting page — spec: substituir de vez).

`nuxt.config.ts` mínimo:

```ts
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  css: ['~/assets/css/tokens.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Joinville Boas Ofertas',
      meta: [
        { name: 'theme-color', content: '#0D131D' },
        { name: 'description', content: 'Ofertas de supermercados em Joinville e região.' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/assets/favicon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&display=swap',
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://joinvilleboasofertas-loc-app.cacin.dev',
    },
  },
})
```

`pages/index.vue` temporário: `<template><h1>Joinville Boas Ofertas</h1></template>`.

- [ ] **Step 2: Docker multi-stage / nginx proxy**

`Dockerfile` (produção-like local):

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

`nginx/default.conf` (essência):

```nginx
upstream nuxt_upstream { server web:3000; }  # ou nome do serviço compose

server {
  listen 80;
  resolver 127.0.0.11 valid=10s ipv6=off;

  location /api/ {
    set $api_upstream snap-api-dev;
    proxy_pass http://$api_upstream:8000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    proxy_pass http://nuxt_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location = /health {
    access_log off;
    return 200 "ok\n";
    add_header Content-Type text/plain;
  }
}
```

`docker-compose.yml`: serviços `web` (Nuxt) + `proxy` (nginx) na rede `snap-net`, porta host `${WEB_PORT:-8092}:80`.

- [ ] **Step 3: Subir e verificar**

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
docker compose up -d --build
curl -sS http://127.0.0.1:8092/health
curl -sS http://127.0.0.1:8092/ | head
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8092/api/public/jbo/offers
```

Expected: health `ok`; HTML com título JBO; API `200` (se snap-api-dev no ar) ou erro de upstream documentado.

- [ ] **Step 4: Atualizar README** com `npm`/compose e remover instruções só-estáticas da waiting page
- [ ] **Step 5: Commit se pedido**

---

### Task 2: Tokens, layout, client API, OfferCard

**Files:**
- Create: `assets/css/tokens.css`, `components/AppHeader.vue`, `components/offers/OfferCard.vue`
- Create: `composables/useJboApi.ts` (ou `utils/jboApi.ts`)
- Test: `tests/components/OfferCard.spec.ts`

**Interfaces:**
- `fetchOffers(params) -> { items, next_cursor }`
- `fetchOffer(id)`, `fetchProduct(slug)`, `fetchEstablishment(slug)`, `fetchCategory(slug)`, `fetchFacets()`, `fetchOffersCount(params)`
- OfferCard props: objeto oferta da API; emite `open` ou usa `NuxtLink` para `/oferta/{id}`

- [ ] **Step 1: tokens.css**

```css
:root {
  --navy: #0D131D;
  --navy-light: #151d2b;
  --yellow: #FFC800;
  --red: #E61E25;
  --white: #FFFFFF;
  --muted: rgba(255, 255, 255, 0.65);
  --surface: #151d2b;
  font-family: "Montserrat", system-ui, sans-serif;
}
body {
  margin: 0;
  background: var(--navy);
  color: var(--white);
}
```

- [ ] **Step 2: Client API**

```ts
/** Monta query string e chama GET same-origin em /api/public/jbo. */
export async function jboGet<T>(path: string, query: Record<string, unknown> = {}): Promise<T> {
  return $fetch<T>(`/api/public/jbo${path}`, { query })
}
```

- [ ] **Step 3: OfferCard** — layout inspirado no `CommunityDealCard` do Snap (faixa economia/OFERTA, nome, mercado, preço, validade), cores JBO; link para `/oferta/{id}` e nome do produto pode linkar `/produto/{slug}`.

- [ ] **Step 4: Vitest**

```ts
import { mount } from '@vue/test-utils'
import OfferCard from '~/components/offers/OfferCard.vue'

test('renderiza nome e preço', () => {
  const wrapper = mount(OfferCard, {
    props: {
      offer: {
        id: '11111111-1111-1111-1111-111111111111',
        product_name: 'Arroz',
        product_slug: 'arroz',
        establishment_name: 'Mercado X',
        establishment_slug: 'mercado-x',
        price: '12.90',
        diff_percent: -10,
        recorded_at: new Date().toISOString(),
      },
    },
  })
  expect(wrapper.text()).toContain('Arroz')
  expect(wrapper.text()).toContain('Mercado X')
})
```

Configurar Vitest no Nuxt (`@nuxt/test-utils` ou vitest + happy-dom como no Snap).

- [ ] **Step 5: Run** `npm test` — PASS
- [ ] **Step 6: Commit se pedido**

---

### Task 3: Home — busca, filtros, listagem infinita (SSR + client)

**Files:**
- Create: `components/offers/SearchBar.vue`, `FilterBar.vue`, `FiltersSheet.vue`
- Create: `composables/useOfferFilters.ts`, `useOffersFeed.ts`
- Modify: `pages/index.vue`
- Test: `tests/composables/useOfferFilters.spec.ts` (sync query)

**Interfaces:**
- Filtros: `q`, `category_ids`, `establishment_ids`, `price_min`, `price_max`, `sort` (`recent` default)
- URL query espelha filtros (compartilhável)
- `useAsyncData` na home para 1ª página SSR; `loadMore` no client com IntersectionObserver

- [ ] **Step 1: useOfferFilters** — ler/escrever `route.query`; `toApiParams()`; `activeCount`; `clear`.

- [ ] **Step 2: useOffersFeed** — `items`, `hasMore`, `loading`, `error`, `loadFirstPage`, `loadMore` chamando `jboGet('/offers', params)`.

- [ ] **Step 3: pages/index.vue**

Estrutura:

```vue
<template>
  <div class="home">
    <AppHeader />
    <SearchBar v-model="filters.q" @submit="reload" />
    <FilterBar :facets="facets" @open-sheet="sheetOpen = true" />
    <section aria-label="Ofertas">
      <OfferCard v-for="o in items" :key="o.id" :offer="o" />
      <div v-if="hasMore" ref="sentinel" />
      <!-- empty / error / skeletons -->
    </section>
    <FiltersSheet v-model:open="sheetOpen" :facets="facets" />
  </div>
</template>
```

SEO head na home: title “Ofertas em Joinville | Joinville Boas Ofertas”; JSON-LD `WebSite` + `SearchAction`.

- [ ] **Step 4: Manual check** em `https://joinvilleboasofertas-loc-app.cacin.dev/` — busca, filtro, scroll
- [ ] **Step 5: Commit se pedido**

---

### Task 4: Páginas produto / oferta / mercado / categoria + privacidade + SEO files

**Files:**
- Create: `pages/oferta/[id].vue`, `pages/produto/[slug].vue`, `pages/mercado/[slug].vue`, `pages/categoria/[slug].vue`, `pages/privacidade.vue`
- Create: `server/routes/robots.txt.ts`, `server/routes/sitemap.xml.ts` (ou `nitro` handlers)
- Migrate: texto de `site/politica-de-privacidade.html` → `privacidade.vue`

**Interfaces:**
- Produto: bloco “Mais barato” (`cheapest`) + lista `offers`
- Oferta: detalhe completo + links para produto e mercado
- `sitemap.xml` agrega `GET /api/public/jbo/sitemap` e prefixa `runtimeConfig.public.siteUrl`
- `robots.txt`: `Allow: /` + `Sitemap: {siteUrl}/sitemap.xml`

- [ ] **Step 1: pages/produto/[slug].vue**

```ts
const route = useRoute()
const { data, error } = await useAsyncData(`product-${route.params.slug}`, () =>
  jboGet(`/products/${route.params.slug}`),
)
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Produto não encontrado' })
useSeoMeta({
  title: () => `${data.value.product.name} — preços em Joinville`,
  description: () => `Compare preços de ${data.value.product.name} nos supermercados de Joinville.`,
})
// JSON-LD Product + Offer para cheapest
```

- [ ] **Step 2: oferta / mercado / categoria** — mesmo padrão SSR + 404
- [ ] **Step 3: robots + sitemap handlers**
- [ ] **Step 4: privacidade** — conteúdo atual, link no footer do header/layout
- [ ] **Step 5: Verificar view-source / curl HTML contém nome do produto e preço (SSR)**
- [ ] **Step 6: Commit se pedido**

---

### Task 5: Polish README + smoke final

**Files:**
- Modify: `README.md` — arquitetura Nuxt + proxy, tabela de rotas, dependência do snap-api
- Optional: atualizar `CLAUDE.MD` do workspace se a convenção de apps mudar (produto JBO além do Snap)

- [ ] **Step 1: Checklist manual**
  - [ ] `/` lista ofertas
  - [ ] `?q=` filtra
  - [ ] `/produto/{slug}` mostra cheapest
  - [ ] `/oferta/{id}` ok
  - [ ] `/sitemap.xml` e `/robots.txt` ok
  - [ ] Sem links para login/scan/lista
- [ ] **Step 2: Commit se pedido**

---

## Spec coverage (self-review)

| Spec | Task |
| --- | --- |
| Nuxt no repo JBO, proxy nginx, substitui waiting page | Task 1 |
| Cores/logo, cards, client API | Task 2 |
| Home busca/filtro/lista como Snap, sem geo | Task 3 |
| Rotas oferta/produto/mercado/categoria, SEO, privacidade | Task 4 |
| README / validação | Task 5 |
| Endpoints / slugs / dedupe | Plano API (pré-requisito) |
