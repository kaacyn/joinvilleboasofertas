# Joinville Boas Ofertas — plataforma pública (MVP)

**Data:** 2026-08-12  
**Repos afetados:** `joinvilleboasofertas` (front Nuxt), `snap-api` (API pública `jbo_public`)  
**Ambiente inicial:** develop (`joinvilleboasofertas-loc-app.cacin.dev` + `snap-api-dev`)

## Objetivo

Substituir a página “Em breve” por uma **plataforma pública de ofertas** com a identidade visual da waiting page (cores, logo, Montserrat), usabilidade de busca/filtro/listagem alinhada ao Snap, endpoints dedicados e listagem **sem** colapsar por produto no mercado mais barato — cada card é o **último preço vigente do produto naquele supermercado**. Pensada para **performance** e **indexação** em buscadores.

## Decisões confirmadas

| Tópico | Decisão |
| --- | --- |
| Front | Evoluir o repo `joinvilleboasofertas` para **Nuxt 3** (SSR) |
| Páginas MVP | Home, detalhe da oferta, produto, mercado, categoria (+ privacidade, robots, sitemap) |
| Localização | **Fixa em Joinville/região** — sem CEP/GPS do usuário |
| Critério de preço | Último `PriceRecord` aprovado **com promo vigente**, por `(product, establishment)` |
| Página de produto | Lista por supermercado + **destaque do mais barato no topo** |
| Waiting page | **Substituir de vez** no develop (waitlist some da UI) |
| Abordagem | Nuxt no domínio JBO + API dedicada `/api/public/jbo/` no snap-api |

## Fora de escopo

- Login, cadastro, perfil, alertas, listas de compra, tirar foto, histórico, compare autenticado
- Reutilizar `/api/home/community-deals` (dedupe e auth diferentes)
- Envio de e-mail / reativação da waitlist na UI (endpoint pode permanecer inerte)
- Produção (`joinvilleboasofertas.com` / `main`) nesta entrega — só develop até validar
- App nativo / PWA pesada / bottom nav do Snap

## Arquitetura

```text
Browser → joinvilleboasofertas-loc-app.cacin.dev
            │
            ├─ Nuxt 3 (SSR) — app no repo joinvilleboasofertas
            │
            └─ /api/*  (nginx same-origin)
                  └─ snap-api  apps.jbo_public
                        GET /api/public/jbo/...
```

- **Front:** Nuxt 3; tokens da waiting page (`--navy #0D131D`, `--yellow #FFC800`, `--red #E61E25`, Montserrat, logo).
- **Back:** app Django `apps.jbo_public` — só leitura, sem auth, rate-limit no padrão do projeto.
- **Imagens:** presets HMAC existentes em `/api/img/{preset}/{id}.webp`.
- **Deploy develop:** container Nuxt na porta atual (8092); nginx faz proxy do Node Nuxt e de `/api` → `snap-api-dev` (rede `snap-net`), no mesmo padrão do proxy da waitlist.

## Páginas e UX

| Rota | Função |
| --- | --- |
| `/` | Home: busca, FilterBar/sheet, infinite scroll de ofertas |
| `/oferta/{id}` | Detalhe do `PriceRecord` (foto, preço, validade, mercado, link ao produto) |
| `/produto/{slug}` | Hub: **mais barato no topo** + preços vigentes por supermercado |
| `/mercado/{slug}` | Ofertas vigentes do estabelecimento |
| `/categoria/{slug}` | Ofertas da categoria |
| `/privacidade` | Política de privacidade (conteúdo atual migrado) |
| `/robots.txt`, `/sitemap.xml` | SEO |

**Home (paridade de usabilidade com o Snap):**

- Busca textual `q`
- Filtros: categorias, estabelecimentos, faixa de preço, ordenação
- Ordenação: `recent` (default), `price`, `savings`
- Sem filtro de distância/CEP; sem chip de localização
- Cards: nome, categoria, supermercado, preço, validade, badge clube, economia vs média quando aplicável
- Sem ações de foto / lista / histórico / share autenticado

**Navegação:** header com logo JBO + busca; sem bottom nav de conta/scan/listas.

## Modelo de dados e slugs

### Critério de oferta visível

Mesmo gate da home Snap:

- `(human_approved OR quality_passed)` no record/produto conforme já usado em `home_visible_records`
- Promo vigente (`active_promo_q`)

### Dedupe (diferença vs Snap)

- Snap: 1 oferta por **produto** (menor preço).
- JBO: 1 oferta por **`(product_id, establishment_id)`** — o `PriceRecord` com maior `recorded_at` entre os vigentes.

### Escopo Joinville

Filtro **server-side** via settings, sem lat/lng do browser:

- Setting `JBO_ESTABLISHMENT_IDS` (allowlist UUID) **ou**, se vazia, bbox configurável `JBO_BBOX` (lat/lng min/max da região de Joinville).
- MVP preferencial: allowlist explícita dos mercados cobertos; bbox como fallback operacional.
- Estabelecimentos `is_admin_only=True` **nunca** entram no feed público.

### Slugs (SEO)

Hoje: `Category.slug` existe; **`Product` e `Establishment` não têm slug**.

Nesta entrega:

- Adicionar `slug` único em `Product` e `Establishment` (SlugField, preenchido no save a partir do nome, com sufixo curto se colidir).
- Migration + backfill para registros existentes.
- URLs públicas usam esses slugs; `id` UUID continua no detalhe de oferta (`/oferta/{uuid}`).

## API pública

Namespace: `/api/public/jbo/` — **sem autenticação**.

| Método | Path | Uso |
| --- | --- | --- |
| `GET` | `/offers` | Feed paginado (cursor) + `q`, categorias, mercados, preço, `sort` |
| `GET` | `/offers/count` | Contagem para o sheet de filtros |
| `GET` | `/offers/facets` | Categorias + estabelecimentos no escopo Joinville |
| `GET` | `/offers/{id}` | Detalhe da oferta (`PriceRecord` id) |
| `GET` | `/products/{slug}` | Produto + `cheapest` + lista de ofertas por mercado |
| `GET` | `/establishments/{slug}` | Mercado + ofertas paginadas |
| `GET` | `/categories/{slug}` | Categoria + ofertas paginadas |
| `GET` | `/sitemap` | Lista de URLs canônicas para o Nuxt montar `sitemap.xml` |

### Shape do card (oferta)

Alinhado ao community deal, sem dados de usuário:

- `id`, `price`, `recorded_at`, `is_club_price`
- `product_id`, `product_name`, `product_slug`, `category_name`, `category_slug`
- `establishment_id`, `establishment_name`, `establishment_slug`
- `avg_price`, `diff_percent`, `diff_amount` (quando houver média)
- Campos de validade de promo já usados no Snap
- `image` / URL de preset assinada
- Campos de preço unitário (`price_volume_min`, etc.) quando existirem

### `GET /products/{slug}`

```json
{
  "product": { "id": "...", "name": "...", "slug": "...", "category": {...} },
  "cheapest": { /* mesmo shape do card, ou null */ },
  "offers": [ /* um por supermercado, vigentes, ordenados por price asc */ ]
}
```

### Paginação

Cursor estável (mesmo espírito do community deals), `page_size` default 20, máximo definido no API.

### Erros

- `404` — slug/id inexistente ou fora do escopo público Joinville
- `422` — params inválidos
- Rate-limit por IP (handler global `Ratelimited`)

### Performance na API

- Query dedupe eficiente (ex.: `DISTINCT ON (product_id, establishment_id)` ordenado por `recorded_at DESC` no Postgres, sobre o queryset filtrado)
- Índices: aproveitar `pricerecord_product_est_idx`; avaliar índice composto com `recorded_at` se necessário
- Cache HTTP curto em detalhe, facets e páginas de produto/mercado/categoria

## Front Nuxt — SEO e performance

**SEO**

- SSR nas rotas indexáveis
- `title`, `description`, `canonical`, Open Graph por página
- JSON-LD: `Product` + `Offer` (seller = supermercado); na home `WebSite` + `SearchAction`
- `sitemap.xml` consumindo `/api/public/jbo/sitemap`
- `robots.txt` permitindo indexação no domínio canônico

**Performance**

- Primeira página da home via SSR; demais via infinite scroll no client
- Imagens WebP assinadas + lazy loading
- Query string compartilável na home (`?q=`, filtros)
- Bundle sem auth/câmera/stores do Snap

**Design**

- Tokens e logo da waiting page
- Layout mobile-first; desktop legível (não é dashboard)
- Empty states e retry alinhados ao Snap

## Erros no front

- Empty: busca sem resultado / filtros sem resultado / catálogo vazio
- Falha de rede: mensagem + “Tentar de novo”
- 404 Nuxt amigável para slug inválido

## Testes

**API**

- Dedupe produto×mercado (dois records no mesmo mercado → só o mais recente vigente)
- Promo expirada não aparece
- Fora da allowlist/bbox / `is_admin_only` não aparece
- Filtros e `q`
- Produto: `cheapest` é o menor preço entre ofertas retornadas
- 404/422 e rate-limit básico

**Front**

- Smoke SSR das rotas principais
- Componentes de busca / filtro / card (Vitest)
- Sem suíte e2e pesada no MVP

## Entrega (ordem)

1. `snap-api`: app `jbo_public` + slugs Product/Establishment + testes
2. `joinvilleboasofertas`: scaffold Nuxt, nginx → Nuxt + `/api`, páginas MVP, SEO
3. Validar em `*-loc-app`; produção em ciclo posterior (`prd` / `main`)

## Critérios de sucesso

- Visitante anônimo vê ofertas de Joinville com busca e filtros utilizáveis como no Snap
- Listagem mostra o mesmo produto em vários mercados quando há preço vigente em cada um
- `/produto/{slug}` destaca o mais barato e lista os demais
- Páginas de produto/mercado/categoria devolvem HTML SSR com meta tags e dados estruturados
- Nenhuma feature autenticada do Snap exposta neste site
