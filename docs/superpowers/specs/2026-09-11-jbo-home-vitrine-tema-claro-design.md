# Home vitrine + tema claro — Design

**Data:** 2026-09-11  
**Repos:** `dev-joinvilleboasofertas` (front) + `dev-snap-api` (`apps/jbo_public`)  
**Referência visual:** `referencia/jbo-prototipo (3).html` (protótipo de um amigo do Fabiano)  
**Fora:** `prd-*` (rollout depois), seção "Mercados que você segue", redesign das páginas internas além das cores, mudança nos filtros do topo (só mudam de cor)

## Objetivo

Trazer para a home do JBO a estrutura de seções do protótipo (Maior economia da semana, Categorias, Maiores descontos em carrossel, Termina hoje, Novas ofertas) e migrar o site inteiro para o tema claro do protótipo. Os filtros do topo (Categorias, Lojas, Ordenar) continuam com o mesmo comportamento.

## Decisões

| Tema | Decisão |
|------|---------|
| Tema | Site inteiro migra para claro (fundo `#F3F4F6`, cards brancos). Navy vira cor de marca (hero, botão primário, chip ativo) |
| Tipografia | Inter no corpo; Montserrat em marca, títulos e preços |
| Home com filtros | Qualquer busca, filtro, faixa de preço, `ends_today` ou ordenação ≠ `recent` esconde as seções e mostra só a lista (comportamento atual) |
| Stories | Saem da home; componente, util, teste e imagens removidos |
| Seções | Hero, Categorias, Maiores descontos, Termina hoje, Novas ofertas (feed atual) |
| Card horizontal | Redesenhado no estilo do protótipo, com imagem do recorte e badge; preserva todas as informações de preço atuais |
| Dados da home | Compor com endpoints existentes (5 chamadas paralelas no SSR); API ganha só `ends_today` e `slug` nas facetas |
| Página de categoria | Ganha scroll infinito com cursor e ícone da categoria no título |
| Entrega | Uma spec, um plano, duas fases em ordem: tema claro, depois home |

## Estado atual (resumo)

- Home: `AppHeader` (logo, busca, instalar app, menu) → `FilterBar` sticky (chips Categorias / Lojas / Ordenar) → `StoryShortcuts` → feed infinito de `OfferCard` (`sort=recent`, `page_size=20`, cursor).
- Filtros vivem na query string via `useOfferFilters` (`q`, `category_ids`, `establishment_ids`, `price_min`, `price_max`, `sort`).
- `OfferCard`: faixa lateral colorida (ECONOMIA x% / OFERTA / EXPIRADO / EM BREVE) + corpo. Não mostra a imagem do recorte, embora `image_url` exista em todas as ofertas.
- Tema escuro em `app/assets/css/tokens.css` (`--navy`, `--navy-light`, `--yellow`, `--red`, `--upcoming*`, `--white`, `--muted`, `--surface`, `--border`). 29 arquivos usam `var(--white)` como cor de texto ou `rgba(255,255,255,…)` fixos.
- API pública: `/offers` (q, categorias, lojas, preço, `sort` ∈ recent|price|savings, cursor), `/offers/count`, `/offers/facets` (id + nome, cache 300 s), `/categories/{slug}` (paginado por cursor). `sort=savings` ordena por economia contra a média histórica (`diff_percent` negativo = economia; zero = sem histórico).
- Dados em dev (2026-09-11): 456 ofertas vigentes, 110 terminam hoje, 13 categorias com os mesmos nomes do protótipo.

---

## Fase 1 — Tema claro

### Tokens (`app/assets/css/tokens.css`)

```css
:root {
  /* marca */
  --navy: #0D131D;      --navy-2: #2A3341;
  --yellow: #FFC800;    --yellow-soft: #FFF3BF;  --yellow-ink: #7A5B00;
  --red: #E61E25;       --red-soft: #FDE7E8;
  --green: #15803D;     --green-soft: #DCFCE7;
  --blue: #0284C7;      --blue-soft: #E0F2FE;
  /* superfícies e texto */
  --bg: #F3F4F6;  --surface: #FFFFFF;  --line: #E6E8EC;
  --ink: #0D131D; --ink-2: #4B5563;    --ink-3: #8A94A3;
  --on-dark: #FFFFFF;   /* texto sobre navy/vermelho */
  /* apelidos mantidos */
  --border: var(--line);  --muted: var(--ink-3);
  --upcoming: var(--blue); --upcoming-light: var(--blue);
  /* forma */
  --r: 14px; --r-sm: 10px;
  --shadow: 0 1px 2px rgba(13,19,29,.05), 0 4px 14px rgba(13,19,29,.06);
  --head: 'Montserrat', system-ui, sans-serif;
  --body: 'Inter', system-ui, sans-serif;
}
```

- `--white` e `--navy-light` **deixam de existir**. Qualquer `var(--white)` remanescente é bug (critério de verificação: `grep -r "var(--white)" app` vazio).
- `body`: `background: var(--bg)`, `color: var(--ink)`, `font-family: var(--body)`, sem gradientes.
- `h1, h2, h3`: `font-family: var(--head)`. Preços e marca usam `var(--head)` no próprio componente.
- `a`: `color: var(--blue)`; componentes de card já definem `color: inherit`.
- `nuxt.config.ts`: Google Fonts `Inter:wght@400;500;600;700` + `Montserrat:wght@700;800;900`; `theme-color`, `manifest.theme_color` e `manifest.background_color` = `#F3F4F6`. Ícones e logo não mudam (o logo é um selo redondo com fundo próprio).

### Regras de mapeamento da varredura

| Antes | Depois |
|-------|--------|
| `var(--white)` como cor de texto | `var(--ink)` (principal) ou `var(--ink-2)` (secundário) |
| `var(--white)` sobre fundo navy/vermelho (hero, badge, botão primário, chip ativo) | `var(--on-dark)` |
| `rgba(255,255,255,.x)` em bordas | `var(--line)` |
| `rgba(255,255,255,.x)` em fundos de hover, chips, pills | `var(--bg)` ou a variante `*-soft` da cor |
| `var(--navy)`, `--navy-light`, `#151d2b`, `rgba(13,19,29,.x)` como fundo de card, popover, sheet, modal, header, filterbar | `var(--surface)` + `border: 1px solid var(--line)`; popovers/modais somam `box-shadow: var(--shadow)` |
| `var(--navy)` como marca (hero, botão primário, chip ativo, fallback de logo) | mantém |
| `var(--yellow)` como cor de texto sobre escuro (preço, links de card) | preço vira `var(--ink)`; destaque vira fundo `--yellow-soft` + texto `--yellow-ink` |
| `var(--upcoming-light)` | `var(--blue)` |
| overlay escuro atrás de modal/lightbox | mantém |
| `var(--muted)`, `var(--border)`, `var(--surface)` | mantém (valores já remapeados) |

### Componentes com tratamento específico

- **AppHeader**: fundo `--surface`, `border-bottom` `--line`, sticky. Ícones (instalar app, menu) em `--ink`. Barra de loading continua amarela.
- **HeaderMenu**: drawer em `--surface`, itens em `--ink`, divisórias `--line`.
- **SearchBar / SearchAutocomplete**: campo como `.search` do protótipo (altura 50px, raio 16px, `--surface`, borda `--line`, `--shadow`); lista de sugestões em `--surface` com `--shadow`.
- **FilterBar / FilterChipDropdown**: barra sticky com fundo `--bg`; gatilhos viram pills (`--surface`, borda `--line`, texto `--ink-2`, 34px, raio 999, gap 8px); chip com filtro ativo em `--navy`/`--on-dark`. Popovers em `--surface` + `--line` + `--shadow`, inputs e botões claros; botão Aplicar continua amarelo. **Mesmo DOM, mesmos eventos, mesma lógica.**
- **FiltersSheet, StoreFollowConfirmModal, AndroidInstallModal, IosInstallModal**: painel `--surface`, overlay mantido.
- **StoreFollowBell**: sino em `--surface` + `--line`; ativo `--yellow-soft` + `--yellow-ink` (`.bell.on` do protótipo).
- **EncarteCard, EncarteLightbox, EncarteRefBadge**: card `--surface`; pills de fase: ativo `--yellow-soft`/`--yellow-ink`, termina hoje `--red-soft`/`--red`, em breve `--blue-soft`/`--blue`, expirado `#EEF0F3`/`--ink-2`.
- **ProductStoreBox** e página `produto/[slug]/[[loja]].vue` (56 usos): melhor preço = `.compare .r.best` do protótipo (`--yellow-soft` + borda `--yellow`); cards e listas em `--surface`; preço grande em `--ink`.
- **Páginas de texto** (privacidade, termos, FAQ, envie-um-encarte, lojas, encartes, loja, categoria): só troca de tokens.
- **OfferCard**: redesenho completo (abaixo), feito ao final da Fase 1 porque é usado em todas as páginas.

### `OfferCard` horizontal (redesenho)

Layout `.offer.h` do protótipo: card `--surface`, borda `--line`, raio `--r`, padding 10px, gap 12px, flex horizontal.

- **Esquerda**: imagem 92×92, raio 12px, fundo `#F7F8FA`, `object-fit: contain`, `src = image_url`, `loading="lazy"`. Sem `image_url`: emoji da categoria (`categoryIcon(slug)`) sobre o fundo suave da categoria.
- **Badge** no canto superior esquerdo da imagem, por `offerBadge(offer)`:
  - expirado → cinza (`#EEF0F3` / `--ink-2`) "EXPIRADO"
  - em breve → azul "EM BREVE"
  - economia (`phase === 'active'` e `diff_percent < 0`) → vermelho "-28%"; se o preço principal é de clube, amarelo "CLUBE -28%"
  - só clube, sem economia → amarelo "CLUBE" (rótulo do programa da loja quando houver, via `clubBadgeLabel`)
  - senão → sem badge
- **Corpo** (mesma informação de hoje, nova ordem): categoria (uppercase, `--ink-3`), nome (600, 2 linhas, `--ink`), subtítulo marca · embalagem (`--ink-3`), linha de preço (Montserrat 900 18px: prefixo "2 por", valor, sufixo "/kg"; ao lado, riscado do regular quando há clube, senão média riscada quando há economia), linha secundária ("R$ 5,00 cada" / preço por 100 g), loja (logo 18px + nome, oculta com `hideStore`), validade, chips (promoção e "Só em …").
- **Validade**: `formatPromoValidityLabel` passa a devolver `Termina hoje` quando a promo vigente termina na data civil de hoje (demais casos inalterados: "Válido até amanhã", "Válido até sábado", "Válido até 20/09/2026", "A partir de …", "Expirou …"). Novo helper `isEndingToday(offer, now)` em `promoPhase.ts`; o card aplica classe `--hot` (`--red`, 600) nesse caso. `EncarteCard` e a página do encarte usam a mesma função, então também passam a mostrar "Termina hoje" (como o protótipo). `formatValidUntil` (usado no título do encarte) não muda; `tests/promoPhase.spec.ts` ganha o caso novo. Expirado em `--ink-3`; em breve em `--blue`.
- `.deal--expired` mantém opacidade reduzida.

`offerBadge(offer): { kind: 'expired' | 'upcoming' | 'savings' | 'club' | null, label: string, club: boolean }` vive em `app/utils/offerBadge.ts` para ser compartilhado com o `OfferTile` e testado isoladamente.

---

## Fase 2 — Home vitrine

### Estado da home

`isVitrineState(state: OfferFiltersState): boolean` em `app/utils/homeVitrine.ts`: true somente quando `q` vazio, `category_ids` e `establishment_ids` vazios, `price_min`/`price_max` nulos, `ends_today` falso e `sort === 'recent'`.

- **Vitrine** (`isVitrine`): Hero → Categorias → Maiores descontos → Termina hoje → Novas ofertas (feed).
- **Lista** (qualquer filtro): feed filtrado como hoje. Se `ends_today` ativo, cabeçalho `Termina hoje` com botão "Limpar" (chama `filters.clear()`); demais casos sem cabeçalho, como hoje.

### Filtro `ends_today` no front (`useOfferFilters.ts`)

- `OfferFiltersState.ends_today: boolean`.
- Query: `ends_today=1` quando true; ausente quando false.
- API params: `ends_today: true` quando true; `undefined` quando false.
- `filtersActiveCount` soma 1 quando true (aciona "Limpar filtros" e o estado de lista).

### Dados (SSR, `useAsyncData` em paralelo)

| Chave | Chamada | Quando |
|-------|---------|--------|
| `jbo-facets` | `/offers/facets` | sempre (já existe; agora com `slug`) |
| `jbo-offers` | `/offers` com `filters.apiParams` + `page_size=20` | sempre (feed; em vitrine equivale a `sort=recent`) |
| `jbo-home-savings` | `/offers?sort=savings&page_size=10` | só vitrine |
| `jbo-home-ending` | `/offers?ends_today=true&sort=recent&page_size=6` | só vitrine |
| `jbo-home-ending-count` | `/offers/count?ends_today=true` | só vitrine |

As três chamadas de vitrine usam `watch: [isVitrine]` e devolvem `null` quando `isVitrine` é falso (sem requisição). Falha em qualquer uma delas esconde só a seção afetada; o feed e as facetas seguem o tratamento de erro atual.

### Seleção do hero e do carrossel (`homeVitrine.ts`)

- `isRealSavings(offer, now)`: `getPromoPhase(offer, now) === 'active'` e `Number(diff_percent) < 0`.
- `pickHero(items, now)`: primeiro item com `isRealSavings`; `null` se nenhum.
- `pickTopSavings(items, heroId, limit = 8, now)`: itens com `isRealSavings`, excluindo `heroId`, até `limit`.
- Hero ausente → seção Hero some. Carrossel vazio → seção Maiores descontos some.

### Seções (componentes em `app/components/home/`)

**`HomeSection.vue`** — wrapper de seção: título (`h2` Montserrat 800 16px) à esquerda, slot `aside` à direita (link "Ver todos" em `--ink-2` 600 13px ou pill). Padding `22px 16px 0`; variante `--bleed` sem padding lateral para o carrossel.

**`HeroSavings.vue`** (`.hero` do protótipo) — props `offer: JboOffer`. Fundo `--navy`, `--on-dark`, raio 20px, brilho radial amarelo no canto. Eyebrow "MAIOR ECONOMIA DA SEMANA" (`--yellow`, 11px, tracking .12em). `h2` 24px 900: nome do produto e, na linha seguinte, preço via `formatOfferPriceParts` (prefixo, valor, sufixo). Parágrafo 13px a 70%: `"{pct}% abaixo da média · {loja} · {termina hoje | até {formatPromoEndLabel}}"`, com `pct = Math.abs(Math.round(diff_percent))` (mesma regra do `OfferCard`). À direita, imagem do recorte 72×72 raio 12px quando houver `image_url`. CTA amarelo "Ver oferta →" para `productOfferPath(offer)`; o card inteiro é o link.

**`CategoryGrid.vue`** — props `categories: JboFacets['categories']`. Usa `app/utils/categoryIcons.ts`:

```ts
export const CATEGORY_ICONS: Record<string, { emoji: string, bg: string }> = {
  acougue: { emoji: '🥩', bg: '#FDE7E8' }, hortifruti: { emoji: '🥦', bg: '#DCFCE7' },
  laticinios: { emoji: '🧀', bg: '#FFF3BF' }, bebidas: { emoji: '🧃', bg: '#E0F2FE' },
  padaria: { emoji: '🥖', bg: '#FFEDD5' }, limpeza: { emoji: '🧴', bg: '#EDE9FE' },
  higiene: { emoji: '🧼', bg: '#FCE7F3' }, mercearia: { emoji: '🛒', bg: '#EEF0F3' },
  congelados: { emoji: '🧊', bg: '#E0F2FE' }, frios: { emoji: '🥓', bg: '#FDE7E8' },
  bebe: { emoji: '🍼', bg: '#FCE7F3' }, pet: { emoji: '🐾', bg: '#FFEDD5' },
  outros: { emoji: '🧺', bg: '#EEF0F3' },
}
export const CATEGORY_ORDER = Object.keys(CATEGORY_ICONS)  // ordem do protótipo, "outros" por último
export function categoryIcon(slug) // fallback { emoji: '🛒', bg: '#EEF0F3' }
export function orderCategories(categories) // ordena por CATEGORY_ORDER; slugs desconhecidos depois, por nome
```

Grade 4 colunas, gap 10px, item `.cat` do protótipo (`--surface`, borda `--line`, emoji 20px em quadrado 40px com fundo suave, nome 11.5px 600 `--ink-2`). Mostra 8; "Ver todas" no `aside` expande para todas (estado local `expanded`, rótulo vira "Ver menos"). Cada item é `NuxtLink` para `/categoria/{slug}`. Categorias sem `slug` são ignoradas.

**`OfferTile.vue`** (`app/components/offers/`, `.offer` vertical do protótipo) — props `offer`. Largura 156px, `--surface`, borda `--line`, raio `--r`. Imagem quadrada (`aspect-ratio: 1`, fundo `#F7F8FA`, `object-fit: contain`, fallback emoji da categoria) com badge por `offerBadge`. Corpo: nome (13.5px 600, 2 linhas), preço (Montserrat 900 18px, com prefixo/sufixo) + riscado (regular se clube, senão média quando há economia), linha secundária ("cada" ou preço por unidade), loja (logo 18px + nome, `--ink-2` 12px), validade (`Termina hoje` em `--red` 600 quando `isEndingToday`, senão `Até {formatPromoEndLabel}` em `--ink-3` 11px), chip de promoção quando houver (chip "Só em …" omitido por espaço). Link para `productOfferPath`.

**`OfferCarousel.vue`** — props `offers: JboOffer[]`. `.hlist` do protótipo: flex horizontal, gap 12px, `overflow-x: auto`, `scroll-snap-type: x mandatory`, itens `scroll-snap-align: start`, padding lateral 16px, scrollbar oculta. Renderiza `OfferTile` por item.

**Termina hoje** (dentro de `index.vue`, usando `HomeSection`): `aside` com pill vermelha `⏱ {count} oferta(s)` (`--red-soft`/`--red`). Lista vertical de até 6 `OfferCard`. Quando `count > 6`, rodapé com link "Ver todas as {count} ofertas" para `/?ends_today=1`. Seção some quando `count === 0` ou a lista vier vazia.

**Novas ofertas**: `HomeSection` com título "Novas ofertas" envolvendo o feed atual (cards, sentinela, "Carregando mais", estados vazio/erro). Sem link no `aside`.

**Maiores descontos**: `HomeSection --bleed`, `aside` link "Ver todos" para `/?sort=savings`, `OfferCarousel` com `pickTopSavings`.

### `index.vue` resultante

```
AppHeader (SearchBar)
FilterBar (inalterada em comportamento)
<template v-if="isVitrine">
  HeroSavings (se hero)
  HomeSection "Categorias" → CategoryGrid
  HomeSection "Maiores descontos" → OfferCarousel (se houver itens)
  HomeSection "Termina hoje" → OfferCard × ≤6 + link (se count > 0)
</template>
<h1 v-else-if="filters.state.ends_today">Termina hoje + Limpar</h1>
HomeSection "Novas ofertas" (título só em vitrine) → feed atual
```

SEO da home inalterado (`useJboSeo` com `WebSite` + `SearchAction`).

### Remoção dos Stories

Apagar `app/components/offers/StoryShortcuts.vue`, `app/utils/storyShortcuts.ts`, `tests/storyShortcuts.spec.ts`, `public/shortcuts/` e a referência em `index.vue`. Verificar com `grep -r "storyShortcuts\|StoryShortcuts\|/shortcuts/"` que não sobra referência (inclusive em `docs/ESTRUTURA-ATUAL.md`, que deve ser atualizado).

### Página de categoria (`categoria/[slug].vue`)

- Título com emoji e fundo suave de `categoryIcon(slug)` ao lado do nome (`h1`).
- Scroll infinito igual ao da home: `extraItems`, `nextCursor`, sentinela com `IntersectionObserver` (`rootMargin: 200px`), `jboGet('/categories/{slug}', { cursor, page_size: 20 })`. "Carregando mais…" e erro silencioso (mantém o que já carregou).

---

## API (`dev-snap-api`, `apps/jbo_public`)

### Filtro `ends_today`

- `services/offers.py`: `_apply_filters(..., ends_today: bool = False)` → `qs.filter(validity_end=timezone.localdate())` quando true. `list_offers` e `count_offers` recebem `ends_today` e repassam.
- `api.py`: `_filter_kwargs(..., ends_today: bool)`; `offers_feed` e `offers_count` ganham o parâmetro `ends_today: bool = False`.
- Semântica: data civil do servidor (`TIME_ZONE` do Django), mesma usada por `is_offer_active` e pela ordenação vigente/vencida. Combina com os demais filtros e sorts.

### `slug` nas facetas

- `schemas.py`: `JboFacetItemSchema.slug: Optional[str] = None`.
- `services/offers.py`: `_compute_offer_facets` inclui `product__category__slug` e `establishment__slug` no `values(...)` e devolve `{"id", "name", "slug"}` para categorias e estabelecimentos.
- Chave de cache vira `jbo:offers:facets:v2` para não servir o shape antigo por até 300 s após o deploy.
- Front: `JboFacets.categories[].slug?: string`; `JboFacets.establishments[].slug?: string`.

### Testes (`tests/jbo_public/test_offers_api.py`)

- `test_ends_today_filters_by_validity_end`: três ofertas (termina hoje, amanhã, ontem) → `/offers?ends_today=true` devolve só a de hoje; `/offers/count?ends_today=true` devolve 1; sem o parâmetro, comportamento atual.
- `test_facets_include_slugs`: categoria e estabelecimento das facetas trazem `slug`.

---

## Testes no front (vitest)

| Arquivo | Cobre |
|---------|-------|
| `tests/homeVitrine.spec.ts` | `isVitrineState` (cada filtro isolado quebra a vitrine; `sort=recent` sem filtros mantém), `pickHero`, `pickTopSavings` (exclui hero, ignora `diff_percent >= 0`, ignora expiradas, respeita limite) |
| `tests/categoryIcons.spec.ts` | ordem do protótipo, `outros` por último, slug desconhecido com fallback e depois dos conhecidos |
| `tests/offerBadge.spec.ts` | expirado, em breve, economia, clube + economia, só clube (rótulo do programa), sem badge |
| `tests/useOfferFilters.spec.ts` | `ends_today` na leitura (`ends_today=1`), escrita, params da API e `activeCount` |
| `tests/promoPhase.spec.ts` | `Termina hoje` quando vence hoje; `isEndingToday` |
| `tests/storyShortcuts.spec.ts` | removido |

Verificação de entrega: `npm test` e build do Nuxt no `dev-joinvilleboasofertas`; `pytest tests/jbo_public` no `snap-api-dev`; `grep -r "var(--white)" app` vazio; screenshots 390×844 das páginas regeneradas em `docs/screens/` (home vitrine, home com filtro, home `ends_today`, produto, loja, categoria, encartes, encarte, lojas, menu, popover de categorias, modal de seguir) e `docs/ESTRUTURA-ATUAL.md` + `README.md` atualizados (tokens, rota home, seções).

## Fora do escopo (segue para outra rodada)

- "Mercados que você segue" na home.
- Descontos por preço de clube (regular vs. clube) na seção Maiores descontos.
- Chips de categoria e ordenação na página de categoria (o protótipo tem; o JBO não).
- Endpoint agregado `/home` com cache (revisitar se as 5 chamadas do SSR pesarem).
- Rollout em `prd-joinvilleboasofertas` e `prd-snap-api`.
