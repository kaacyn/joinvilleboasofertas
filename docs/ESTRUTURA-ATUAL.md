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
| `/` | Home de ofertas | `docs/screens/01-home.png` |
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

---

## Equivalências ao prompt “Mr Hype”

O template original citava loja+admin, PIN, enum de status de pedido e tipos Produto/Pedido/Cliente. No JBO:

| Conceito do prompt | Equivalente JBO |
|--------------------|-----------------|
| Rotas loja | Todas as rotas públicas acima |
| Rotas admin + PIN | **Não existem neste front** |
| Categorias com cores | Categorias vêm da API **sem cor**; atalhos Stories têm anel amarelo/vermelho quando ativos |
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

## 1. `/` — Home de ofertas

**Arquivo:** `app/pages/index.vue`  
**Componentes:** `AppHeader`, `SearchBar` (+ `SearchAutocomplete`), `FilterBar` (+ `FilterChipDropdown`), `StoryShortcuts`, `OfferCard`

### Estrutura (cima → baixo)
1. Header sticky + busca
2. FilterBar sticky (Categorias | Lojas | Ordenar)
3. Seção “Ofertas em Joinville”
4. Faixa Stories (atalhos)
5. Lista de `OfferCard` + sentinel infinite scroll
6. Estados loading / empty / error

### Dados exibidos

| UI | Origem |
|----|--------|
| Facets categorias/lojas | `GET /offers/facets` → `JboFacets` |
| Lista de ofertas | `GET /offers` (`q`, `category_ids`, `establishment_ids`, `price_min`, `price_max`, `sort`, `page_size=20`, `cursor`) → `JboOffersPage` |
| Filtros na URL | `useOfferFilters`: `q`, `category_ids`, `establishment_ids`, `price_min`, `price_max`, `sort` (default `recent`) |
| Stories | estático `STORY_SHORTCUTS` |
| Suggest | `GET /products/suggest?q=` → `JboSuggestItem[]` |

**Card (`JboOffer`):** faixa (economia `%` / OFERTA / EXPIRADO / EM BREVE), `category_name`, `product_name`, logo+nome loja, validade, preço + volume, unitário, badge clube, `avg_price` riscado.

### Ações
| Controle | Efeito |
|----------|--------|
| Busca / suggest | `filters.patch({ q })` |
| Chips Categorias / Lojas | `patch` dos ids |
| Ordenar | `recent` / `price` / `savings` |
| Story | aplica ou limpa `q` + `category_ids` |
| OfferCard | `/produto/{slug}/{loja}` |
| Limpar filtros | `filters.clear()` |
| Tentar de novo | `refresh()` |
| Scroll sentinel | próxima página com `cursor` |

### Estados
- Loading: “Carregando ofertas…” / “Carregando mais produtos”
- Empty: mensagens por `q` / filtros / sem ofertas + limpar
- Error: “Não foi possível carregar as ofertas.”
- Sem abas

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
**Componentes:** `AppHeader`, `StoreFollowBell`, `OfferCard` (`hide-store`)

### Estrutura
Header → cabeçalho loja (logo, nome, endereço, sino) → lista de ofertas → empty

### Dados
`GET /establishments/{slug}` → `{ establishment, items: JboOffer[], next_cursor }`  
(`next_cursor` no tipo; **sem UI de paginação**)

### Ações
Sino → follow · OfferCard → produto na loja

### Estados
Loading no header · Error API → **404** “Loja não encontrada” · Empty “Sem ofertas vigentes nesta loja.”

---

## 4. `/categoria/[slug]`

**Arquivo:** `app/pages/categoria/[slug].vue`  
**Componentes:** `AppHeader`, `OfferCard`

### Estrutura
Header → h1 `category.name` → cards → empty

### Dados
`GET /categories/{slug}` → `{ category: { id, name, slug }, items: JboOffer[], next_cursor }`

### Ações
OfferCard → `/produto/{slug}/{loja}`

### Estados
Loading header · 404 “Categoria não encontrada” · Empty “Sem ofertas vigentes nesta categoria.”

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

### Atalhos Stories (home) — estáticos

| id | label | `q` | categoryNames | imagem |
|----|-------|-----|---------------|--------|
| ovos | Ovos | Ovos | Hortifruti, Mercearia | `/shortcuts/ovos.webp` |
| cafe | Café | Café | Mercearia | `/shortcuts/cafe.webp` |
| leite | Leite | Leite | Laticínios | `/shortcuts/leite.webp` |
| arroz | Arroz | Arroz | Mercearia | `/shortcuts/arroz.webp` |
| feijao | Feijão | Feijão | Mercearia | `/shortcuts/feijao.webp` |
| oleo | Óleo | Óleo | Mercearia | `/shortcuts/oleo.webp` |
| frango | Frango | Frango | Açougue | `/shortcuts/frango.webp` |
| acougue | Açougue | *(vazio)* | Açougue | `/shortcuts/acougue.webp` |

**Cor do atalho ativo:** anel `linear-gradient(135deg, var(--yellow), var(--red))`; label `var(--yellow)`.

---

## Enum de “status” (promo — não pedido)

```ts
type PromoPhase = 'active' | 'upcoming' | 'expired'
```

| Valor | Regra | UI |
|-------|-------|-----|
| `active` | hoje ∈ [start, end] | stripe `--yellow` ou `--red` (economia) |
| `upcoming` | start > hoje | “Em breve”, `--upcoming` |
| `expired` | end < hoje | stripe `#3a4454`, opacidade ↓ |

Ordenação ofertas: `recent` \| `price` \| `savings`  
Ordenação encartes: `created` \| `ends`  
Role lead: `user` \| `merchant`

---

## Tipos principais (`app/utils/jboApi.ts`)

### `JboOffer` (oferta / “produto na loja”)
`id`, `product_id`, `product_name`, `product_slug`, `category_name?`, `category_slug?`, `establishment_id/name/slug`, `establishment_loyalty_program_name?`, `establishment_logo_url?`, `establishment_address?`, `establishment_addresses?`, `price`, `is_club_price?`, `promo_starts_on/ends_on?`, `promo_active?`, `avg_price?`, `diff_percent?`, `diff_amount?`, `recorded_at`, `image_url?`, `encarte_id?`, `price_volume_min?`, `volume_unit_min?`, `comparison_base?`, `volume_value?`, `volume_unit?`, `pricing_mode?`

### `JboEncarte`
`id`, `establishment_id/name/slug`, `establishment_logo_url?`, `promo_starts_on?`, `promo_ends_on`, `promo_active`, `image_url?`, `image_url_xl?`, `created_at`

### Produto (página)
`ProductPage`: `{ product: { id, name, slug, category? }, cheapest: JboOffer | null, offers: JboOffer[] }`

### Estabelecimento / “cliente loja”
`EstItem`: `{ id, name, slug, address?, logo_url? }`  
`EstPage`: `{ establishment, items: JboOffer[], next_cursor }`

### Outros
`JboOffersPage` / `JboEncartesPage` · `JboFacets` · `JboSuggestItem` · `pricing_mode` tratado em `unitPrice.ts` (`by_measure`, `bandeja`, `pacote`, `caixa`, `fardo`, `fixed_package`)

---

## Tokens de design (`app/assets/css/tokens.css`)

Não há Tailwind. Variáveis:

```css
:root {
  --navy: #0D131D;
  --navy-light: #151d2b;
  --yellow: #FFC800;
  --red: #E61E25;
  --upcoming: #0284c7;
  --upcoming-light: #38bdf8;
  --white: #FFFFFF;
  --muted: rgba(255, 255, 255, 0.65);
  --surface: #151d2b;
  --border: rgba(255, 255, 255, 0.08);
}
```

- Fonte: Montserrat 600–900 + system-ui  
- Body: radiais amarelo/vermelho + gradiente navy → `#0a0f17`  
- Links: `--yellow`  
- PWA `theme_color` / `background_color`: `#0D131D`  
- Spacing/shadow/radius: valores locais nos componentes (ex. radius 8–18px)

---

## Endpoints públicos usados

| Método | Path |
|--------|------|
| GET | `/offers`, `/offers/facets`, `/offers/{id}` |
| GET | `/products/suggest`, `/products/{slug}` |
| GET | `/establishments`, `/establishments/{slug}` |
| GET | `/categories/{slug}` |
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
