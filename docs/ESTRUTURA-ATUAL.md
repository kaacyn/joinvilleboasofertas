# Estrutura atual — Joinville Boas Ofertas (front público)

Documento de handoff para design. Gerado a partir do código em `dev-joinvilleboasofertas` **sem alterar a aplicação**.

| Item | Valor |
|------|--------|
| App | Nuxt 4 + Vue 3 (PWA) |
| Escopo deste repo | **Somente vitrine pública** — não há painel admin neste frontend |
| Admin / curadoria | Snap Studio + endpoints `/api/admin/*` no snap-api (fora deste repo) |
| Base API pública | `/api/public/jbo/*` |
| Design system | CSS variables em `app/assets/css/tokens.css` (**não há `tailwind.config`**) |
| Screenshots | `docs/screens/` · viewport **390×844** · full-page |

Shell global (`app/app.vue`): `<NuxtPage />` + modal global `StoreFollowConfirmModal`. Não há `app/layouts/`. Quase todas as páginas usam `AppHeader` (logo → `/`, slot, `InstallAppButton`, `HeaderMenu`, barra de loading).

---

## Índice de rotas

| Rota | Página | Screenshot |
|------|--------|------------|
| `/` | Home vitrine | `docs/screens/01-home.png` |
| `/lojas` | Lista de lojas | `docs/screens/02-lojas.png` |
| `/loja/[slug]` | Página da loja | `docs/screens/03-loja.png` |
| `/categoria/[slug]` | Página da categoria | `docs/screens/04-categoria.png` |
| `/produto/[slug]` e `/produto/[slug]/[loja]` | Produto / oferta na loja | `docs/screens/05-produto.png` |
| `/oferta/[id]` | Redirect legado 301 | (sem UI) |
| `/encartes` | Grid de encartes | `docs/screens/06-encartes.png` |
| `/encarte/[id]` | Detalhe do encarte | `docs/screens/07-encarte.png` |
| `/envie-um-encarte` | Lead de encarte | `docs/screens/08-envie-encarte.png` |
| `/perguntas-frequentes` | FAQ | `docs/screens/09-faq.png` |
| `/privacidade` | Política LGPD | `docs/screens/10-privacidade.png` |
| `/termos` | Termos de uso | `docs/screens/11-termos.png` |

Overlays / estados extras:

| Artefato | Screenshot |
|----------|------------|
| Menu hamburger aberto | `docs/screens/12-menu.png` |
| Chip de filtro Categorias aberto (home) | `docs/screens/13-filtro-categorias.png` |
| Lightbox de encarte | `docs/screens/14-encarte-lightbox.png` |
| Modal “Seguir esta loja?” | `docs/screens/15-follow-modal.png` |
| Home em modo lista (busca `?q=arroz`) | `docs/screens/16-home-filtro.png` |
| Home “Termina hoje” (`?ends_today=1`) | `docs/screens/17-home-termina-hoje.png` |

---

## Equivalências ao prompt “Mr Hype”

O template original citava loja+admin, PIN, enum de status de pedido e tipos Produto/Pedido/Cliente. No JBO:

| Conceito do prompt | Equivalente JBO |
|--------------------|-----------------|
| Rotas loja | Todas as rotas públicas acima |
| Rotas admin + PIN | **Não existem neste front** |
| Categorias com cores | Emoji + fundo suave por slug em `app/utils/categoryIcons.ts` (grade da home e título da página de categoria) |
| Enum status de pedido | Não há pedidos; há **`PromoPhase`**: `active` \| `upcoming` \| `expired` |
| Tipos Produto/Pedido/Cliente | **`JboOffer`**, **`JboEncarte`**, produto em `ProductPage`, estabelecimento (`EstItem` / `EstPage`) |
| Tokens `tailwind.config` | Tokens em **`tokens.css`** (abaixo) |

---

## Shell e overlays globais

### `AppHeader`
- Logo “Joinville Boas Ofertas” → `/`
- Slot (ex.: `SearchBar` na home)
- `InstallAppButton` → abre `IosInstallModal` ou `AndroidInstallModal` / dispara `beforeinstallprompt`
- `HeaderMenu` — links: `/`, `/lojas`, `/encartes`, `/envie-um-encarte`, `/perguntas-frequentes`, `/privacidade`, `/termos`
- Barra de loading amarela (`useSyncLoadingIndicator`)

### `StoreFollowConfirmModal` (global)
- Disparado pelo `StoreFollowBell` quando a loja ainda não é seguida
- Campos: título “Seguir esta loja?”, `storeName`, instruções conforme `instructionMode`: `ios-install` \| `request-permission` \| `permission-denied` \| `ready`
- Ações: “Agora não” → `cancelFollow`; primário → `confirmFollow` (PWA / permissão / `PUT /push/devices` + `PUT /push/follows`)

### APIs de follow / push
| Método | Path | Body / resposta |
|--------|------|-----------------|
| GET | `/push/vapid-public-key` | `{ public_key }` |
| POST | `/push/follows/query` | `{ endpoint }` → `{ establishment_ids }` |
| PUT | `/push/devices` | `{ endpoint, p256dh, auth, user_agent }` |
| PUT | `/push/follows` | `{ endpoint, establishment_id, following }` |
| POST | `/push/click` | `{ token }` (service worker) |

Estado em `useState` (não localStorage): `jbo:followed-stores`, hints, VAPID, flags de push.

### Nota
`FiltersSheet.vue` existe em `app/components/offers/` mas **não é usado** por nenhuma página.

---

## 1. `/` — Home vitrine

**Arquivo:** `app/pages/index.vue`  
**Componentes:** `AppHeader`, `SearchBar` (+ `SearchAutocomplete`), `FilterBar` (+ `FilterChipDropdown`), `HomeSection`, `HeroSavings`, `CategoryGrid`, `OfferCarousel` (+ `OfferTile`; setas anterior/próxima só com mouse, via `useCarouselNav`), `OfferCard`

### Estrutura (cima → baixo)
1. Header sticky + busca
2. FilterBar sticky (Categorias | Lojas | Ordenar) — pills claras, chip ativo em navy
3. **Só em vitrine** (sem busca, filtros, faixa de preço, `ends_today` e `sort=recent`):
   - Hero “Maior economia da semana” (`HeroSavings`) — primeira oferta vigente com economia real
   - Seção “Categorias” (`CategoryGrid`, 8 + “Ver todas”)
   - Carrosséis por categoria: Mercearia, Açougue, Bebidas e Hortifruti (`OfferCarousel` de até 8 `OfferTile` vigentes, ordem por economia, título com emoji da categoria + “Ver todas” → `/categoria/{slug}`)
   - Seção “Termina hoje” (até 6 `OfferCard` + pill com a contagem + “Ver todas”)
4. Seção “Novas ofertas” = feed infinito de `OfferCard` (título só em vitrine)
5. Com `?ends_today=1`: título “Termina hoje” + botão Limpar em vez das seções
6. Estados loading / empty / error

Regras em `app/utils/homeVitrine.ts` (`isVitrineState`, `pickHero`, `pickTopSavings`, `HOME_CATEGORY_SLUGS`, `pickCategoryHighlights`).

### Dados exibidos

| UI | Origem |
|----|--------|
| Facets categorias/lojas (com `slug`) | `GET /offers/facets` → `JboFacets` |
| Feed | `GET /offers` (`q`, `category_ids`, `establishment_ids`, `price_min`, `price_max`, `sort`, `ends_today`, `page_size=20`, `cursor`) → `JboOffersPage` |
| Hero (vitrine) | `GET /offers?sort=savings&page_size=10` |
| Termina hoje (vitrine) | `GET /offers?ends_today=true&sort=random&page_size=6` + `GET /offers/count?ends_today=true` |
| Carrosséis por categoria (vitrine) | `GET /categories/{slug}?sort=savings&page_size=10` × 4 (`mercearia`, `acougue`, `bebidas`, `hortifruti`) |
| Filtros na URL | `useOfferFilters`: `q`, `category_ids`, `establishment_ids`, `price_min`, `price_max`, `sort` (default `recent`), `ends_today` (`1`) |
| Suggest | `GET /products/suggest?q=` → `JboSuggestItem[]` (`id`, `name`, `brand`, `quantity_label`; exibido como título completo via `suggestionTitle`) |

As quatro chamadas da vitrine só rodam em vitrine (`watch: [isVitrine]`; a de categorias dispara as 4 requisições em paralelo); falha em uma esconde só a seção.

**Card horizontal (`OfferCard`):** imagem do recorte 92×92 (ou emoji da categoria) com badge (`offerBadge`: `-28%` vermelho, `CLUBE -28%`/`CLUBE` amarelo, `EM BREVE` azul, `EXPIRADO` cinza), categoria, título completo (`offerTitle`: nome + marca + volume, ex. “Óleo de Soja Coamo 900 ml”), preço (Montserrat) + regular/média riscados, “cada”/unitário, loja, validade (“Termina hoje” em vermelho), chips.

### Ações
| Controle | Efeito |
|----------|--------|
| Busca / suggest | `filters.patch({ q })` |
| Chips Categorias / Lojas | `patch` dos ids |
| Ordenar | `recent` / `price` / `savings` |
| Hero / tile / card | `/produto/{slug}/{loja}` |
| Categoria da grade | `/categoria/{slug}` |
| “Ver todos” (descontos) | `/?sort=savings` |
| “Ver todas” (carrossel de categoria) | `/categoria/{slug}` |
| “Ver todas as N ofertas” | `/?ends_today=1` |
| Limpar filtros | `filters.clear()` |
| Tentar de novo | `refresh()` |
| Scroll sentinel | próxima página com `cursor` |

### Estados
- Loading: “Carregando ofertas…” / “Carregando mais produtos”
- Empty: mensagens por `q` / filtros / sem ofertas + limpar
- Error: “Não foi possível carregar as ofertas.”
- Sem hero/carrossel quando nenhuma oferta tem economia real; carrossel de categoria some sem oferta vigente; sem “Termina hoje” quando `count=0`

---

## 2. `/lojas`

**Arquivo:** `app/pages/lojas.vue`  
**Componentes:** `AppHeader`, `StoreFollowBell`

### Estrutura
Header → h1 “Lojas” + subtítulo → input busca → lista (logo/iniciais, nome, endereço, sino) → hint de follow

### Dados
| UI | Origem |
|----|--------|
| Lista | `GET /establishments` → `{ items: EstItem[] }` (`id`, `name`, `slug`, `address?`, `logo_url?`) |
| Busca | filtro client-side em `name` (sem acento) |

### Ações
- Linha → `/loja/{slug}`
- Sino → `requestToggle(id, name)` → modal follow

### Estados
Loading “Carregando…” · Error “Não foi possível carregar a lista.” · Empty “Nenhuma loja encontrada.”

---

## 3. `/loja/[slug]`

**Arquivo:** `app/pages/loja/[slug].vue`  
**Componentes:** `AppHeader`, `StoreActionsBar` (+ `StoreFollowBell`), `StoreAddressesSheet`, `OfferCard` (`hide-store`)

### Estrutura
Header → trilha → barra de ações à direita (endereços · compartilhar · sino, 44×44, só ícone com `aria-label`/`title`; avisos numa linha à esquerda dos botões) → cabeçalho loja (logo, nome, linha de endereço clicável) → lista de ofertas → empty

### Dados
`GET /establishments/{slug}` → `{ establishment, items: JboOffer[], next_cursor }`  
`establishment.addresses`: filiais `{ address, lat, lng, google_place_id, phones: [{ number, is_whatsapp }] }` em `sort_order`, sem texto repetido; sem filial, o endereço principal. API sem o campo: `storeBranches` usa `address` (rota por texto).  
(`next_cursor` no tipo; **sem UI de paginação**)

### Ações
- Ícone de endereços ou linha abaixo do nome (o endereço, ou “N endereços”) → `StoreAddressesSheet` (folha no celular, janela central ≥560px; `useDialogLock`). Por filial: **Como chegar** (Google Maps, link universal com lat/lng + `place_id`), **Waze**, telefone (`tel:`) e WhatsApp quando marcado. Links em `utils/storeDirections.ts`. Sem endereço, o ícone some.
- Compartilhar → `useShareLink` (folha nativa; senão copia a URL canônica e mostra “Link copiado” por 2 s)
- Sino → follow · OfferCard → produto na loja

### Estados
Loading no header · Error API → **404** “Loja não encontrada” · Empty “Sem ofertas vigentes nesta loja.”

---

## 4. `/categoria/[slug]`

**Arquivo:** `app/pages/categoria/[slug].vue`  
**Componentes:** `AppHeader`, `OfferCard`

### Estrutura
Header → título com emoji/fundo da categoria (`categoryIcon(slug)`) → cards → sentinela de scroll infinito (`cursor`, `page_size=20`) → empty

### Dados
`GET /categories/{slug}` (aceita `sort`: `recent` | `price` | `savings`; a página usa `recent`) → `{ category: { id, name, slug }, items: JboOffer[], next_cursor }`

### Ações
OfferCard → `/produto/{slug}/{loja}` · scroll → próxima página

### Estados
Loading header · “Carregando mais…” · 404 “Categoria não encontrada” · Empty “Sem ofertas vigentes nesta categoria.”

---

## 5. `/produto/[slug]` e `/produto/[slug]/[loja]`

**Arquivo:** `app/pages/produto/[slug]/[[loja]].vue`

### Redirects
- Sem `loja` e com `cheapest.establishment_slug` → **301** para `/produto/{slug}/{loja}`
- Com `loja` sem oferta → **404**

### Componentes
`AppHeader`, `EncarteRefBadge`, `ProductStoreBox` (+ `StoreFollowBell`), `OfferCard`, `EncarteLightbox`

### Estrutura
1. Eyebrow categoria (link)
2. Título + compartilhar + “Link copiado”
3. Trecho do encarte (imagem / empty, stamp “No encarte”, badge ref, CTA “Ver encarte completo”)
4. Oferta nesta loja (preço, unitário, clube, validade, `ProductStoreBox`)
5. “Onde encontrar mais {produto}” — outras lojas
6. “Outros produtos de {loja}” — cards + “Veja todos…”
7. Lightbox do encarte (condicional)

### Dados
| Fonte | Path | Uso |
|-------|------|-----|
| Produto | `GET /products/{slug}` | `product`, `cheapest`, `offers[]` |
| Relacionados | `GET /offers?establishment_ids=&page_size=12&sort=recent` | até 5, exclui produto atual |
| Encarte full | `GET /encartes/{encarte_id}` | lightbox |

### Ações
Share (Web Share / copia) · Ver encarte completo · Fechar lightbox · Link categoria · ProductStoreBox (loja / endereços / sino) · Outras lojas · Related cards · “Veja todos…” → `/loja/{slug}` · Badge copia código curto do scan-id

### Estados
Sem imagem: “Recorte do encarte indisponível.” · Abrindo / erro encarte · 404 produto · Faixas EXPIRADO / EM BREVE nas outras lojas

---

## 6. `/oferta/[id]` — legado

**Arquivo:** `app/pages/oferta/[id].vue`  
Sem UI. `GET /offers/{id}` → **301** `productOfferPath(offer)` ou **404**.

---

## 7. `/encartes`

**Arquivo:** `app/pages/encartes.vue`  
**Componentes:** `AppHeader`, `FilterBar` (`show-categories=false`), `EncarteCard`, `EncarteLightbox`

### Estrutura
Header → FilterBar (Lojas \| Ordenar) → intro + CTA “Envie um encarte” → grid → “Carregar mais” → lightbox

### Dados
| Fonte | Path |
|-------|------|
| Lojas filtro | `GET /encartes/stores` |
| Lista | `GET /encartes` (`establishment_ids`, `sort`, `cursor`, `limit=20`) |
| URL | `useEncartesFilters`: `establishment_ids`, `sort` default `created` |

Sort: `created` “Cadastro” · `ends` “Vencimento”  
Card: imagem, loja, validade, `created_at` relativo, badges, sino, share, `EncarteRefBadge`

### Ações
CTA → `/envie-um-encarte` · filtros · abrir lightbox · sino/share · carregar mais

### Estados
Erro stores (fallback todas) · Loading · Error lista · Empty · Load more disabled

---

## 8. `/encarte/[id]`

**Arquivo:** `app/pages/encarte/[id].vue`  
**Componentes:** `AppHeader`, `EncarteRefBadge`

### Estrutura
Header → h1 + sino + share → hints → link loja → validade → badge fase → “Cadastrado…” → foto XL + badge ref

### Dados
`GET /encartes/{id}` → `JboEncarte`

### Ações
Sino · Share `/encarte/{id}` · Link loja · Badge copia código

### Estados
404 “Encarte não encontrado” · Badges Expirado / Em breve

---

## 9. `/envie-um-encarte`

**Arquivo:** `app/pages/envie-um-encarte.vue`  
Só `AppHeader` + formulário / sucesso.

| Campo UI | Body `POST /encarte-leads` |
|----------|----------------------------|
| Nome da loja * | `store_name` |
| Nome do solicitante * | `requester_name` |
| E-mail * | `requester_email` |
| Instagram (opc.) | `instagram` \| `null` |
| Sou * user/merchant | `role` |

Estados: “Enviando…” · erro validação/API · sucesso (form oculto)

---

## 10. `/perguntas-frequentes`

Estático em `<details>` (seções comprador / lojas). JSON-LD FAQPage. Links: `/envie-um-encarte`, Instagram. Sem API.

---

## 11. `/termos` e 12. `/privacidade`

Texto legal estático + `AppHeader`. Links cruzados e Instagram / home.

---

## Categorias

### Dinâmicas (API facets — **sem cor no front**)

Lista tipicamente: Açougue, Bebidas, Bebê, Congelados, Frios, Higiene, Hortifruti, Laticínios, Limpeza, Mercearia, Outros, Padaria, Pet.

### Ícones (front — `app/utils/categoryIcons.ts`)

Emoji e fundo suave por slug (açougue 🥩, hortifruti 🥦, laticinios 🧀, bebidas 🧃, padaria 🥖, limpeza 🧴, higiene 🧼, mercearia 🛒, congelados 🧊, frios 🥓, bebe 🍼, pet 🐾, outros 🧺); fallback 🛒 cinza. `orderCategories` segue essa ordem, desconhecidos por nome e `outros` por último. Os atalhos Stories foram removidos da home.

---

## Enum de “status” (promo — não pedido)

```ts
type PromoPhase = 'active' | 'upcoming' | 'expired'
```

| Valor | Regra | UI |
|-------|-------|-----|
| `active` | hoje ∈ [start, end] | badge `-N%` (`--red`) ou `CLUBE` (`--yellow`); “Termina hoje” em `--red` quando vence hoje |
| `upcoming` | start > hoje | “Em breve”, `--blue-soft` / `--blue` |
| `expired` | end < hoje | badge `#EEF0F3` / `--ink-2`, opacidade ↓ |

Ordenação ofertas: `recent` \| `price` \| `savings`  
Ordenação encartes: `created` \| `ends`  
Role lead: `user` \| `merchant`

---

## Tipos principais (`app/utils/jboApi.ts`)

### `JboOffer` (oferta / “produto na loja”)
`id`, `product_id`, `product_name`, `product_slug`, `brand?`, `category_name?`, `category_slug?`, `establishment_id/name/slug`, `establishment_loyalty_program_name?`, `establishment_logo_url?`, `establishment_address?`, `establishment_addresses?`, `offer_addresses?`, `price?`, `club_price?`, `pricing?` (`basis`, `lot_quantity`, `reference`), `quantity?`, `quantity_label?`, `promotion?`, `quantity_discount?`, `promo_starts_on/ends_on?`, `promo_active?`, `unit_price?`, `unit_price_base?`, `avg_price?`, `diff_percent?`, `diff_amount?`, `recorded_at`, `image_url?`, `encarte_id?`, `encarte_bbox?`

### `JboEncarte`
`id`, `establishment_id/name/slug`, `establishment_logo_url?`, `promo_starts_on?`, `promo_ends_on`, `promo_active`, `image_url?`, `image_url_xl?`, `created_at`

### Produto (página)
`ProductPage`: `{ product: { id, name, slug, category? }, cheapest: JboOffer | null, offers: JboOffer[] }`

### Estabelecimento / “cliente loja”
`EstItem`: `{ id, name, slug, address?, logo_url? }`  
`EstPage`: `{ establishment, items: JboOffer[], next_cursor }`

### Outros
`JboOffersPage` / `JboEncartesPage` · `JboFacets` (`{ id, name, slug? }`) · `JboSuggestItem` (`{ id, name, brand?, quantity_label? }`) · título completo em `offerTitle.ts`; preço por base em `offerPrice.ts`; badge em `offerBadge.ts`

---

## Tokens de design (`app/assets/css/tokens.css`)

Não há Tailwind. Tema claro (protótipo):

```css
:root {
  --navy: #0D131D;      --navy-2: #2A3341;
  --yellow: #FFC800;    --yellow-soft: #FFF3BF;  --yellow-ink: #7A5B00;
  --red: #E61E25;       --red-soft: #FDE7E8;
  --green: #15803D;     --green-soft: #DCFCE7;
  --blue: #0284C7;      --blue-soft: #E0F2FE;
  --bg: #F3F4F6;  --surface: #FFFFFF;  --line: #E6E8EC;
  --ink: #0D131D; --ink-2: #4B5563;    --ink-3: #8A94A3;
  --on-dark: #FFFFFF;
  --border: var(--line);  --muted: var(--ink-3);
  --upcoming: var(--blue); --upcoming-light: var(--blue);
  --r: 14px; --r-sm: 10px;
  --shadow: 0 1px 2px rgba(13,19,29,.05), 0 4px 14px rgba(13,19,29,.06);
  --head: "Montserrat", system-ui, sans-serif;
  --body: "Inter", system-ui, sans-serif;
}
```

- Fontes: Inter 400–700 no corpo; Montserrat 700–900 em títulos, marca e preços  
- Body: `--bg` liso, texto `--ink`; links `--blue`  
- `--white` e `--navy-light` não existem; texto sobre navy/vermelho usa `--on-dark`  
- PWA `theme_color` / `background_color`: `#F3F4F6`  
- Raio `--r` 14px / `--r-sm` 10px; sombra `--shadow` em popovers/modais

---

## Endpoints públicos usados

| Método | Path |
|--------|------|
| GET | `/offers` (inclui `ends_today`), `/offers/count`, `/offers/facets`, `/offers/{id}` |
| GET | `/products/suggest`, `/products/{slug}` |
| GET | `/establishments`, `/establishments/{slug}` |
| GET | `/categories/{slug}` (aceita `sort`) |
| GET | `/encartes`, `/encartes/stores`, `/encartes/{id}` |
| GET | `/push/vapid-public-key` |
| PUT | `/push/devices`, `/push/follows` |
| POST | `/push/follows/query`, `/push/click`, `/encarte-leads` |
| GET | `/sitemap` (via `server/routes/sitemap.xml.ts`) |

---

## Inventário de modais / overlays

| Overlay | Onde |
|---------|------|
| `StoreFollowConfirmModal` | Global |
| `EncarteLightbox` | `/encartes`, `/produto/...` |
| `FilterChipDropdown` | Home, Encartes |
| `HeaderMenu` | Todas com header |
| `IosInstallModal` / `AndroidInstallModal` | Via instalar app |
| Autocomplete | Home |
| `FiltersSheet` | **Não usado** |
