# Home vitrine + tema claro — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar o JBO inteiro para o tema claro do protótipo e transformar a home em vitrine por seções (Hero, Categorias, Maiores descontos, Termina hoje, Novas ofertas), com o filtro `ends_today` e `slug` nas facetas na API pública.

**Architecture:** Tokens CSS novos em `tokens.css` + varredura dos componentes (regras de mapeamento fixas). Utilitários puros e testados (`offerBadge`, `categoryIcons`, `homeVitrine`, `isEndingToday`) alimentam componentes novos em `app/components/home/` e o `OfferCard` redesenhado. A home compõe 5 chamadas SSR em paralelo aos endpoints existentes; a API só ganha `ends_today` e `slug`.

**Tech Stack:** Nuxt 4 + Vue 3 + Vitest (happy-dom) no `dev-joinvilleboasofertas`; Django 5 + django-ninja + pytest no `dev-snap-api` (`apps/jbo_public`); Playwright do cache do npx + Chromium 1228 para screenshots.

**Spec:** `docs/superpowers/specs/2026-09-11-jbo-home-vitrine-tema-claro-design.md` (este repo). Contrato da oferta: `dev-snap-api/docs/superpowers/specs/2026-09-09-integracao-mega-brain-design.md` §8.2.

## Global Constraints

- Comentários de função/método em português (JSDoc em TS/Vue, docstring em Python); imports só no topo do arquivo.
- Commits diretos em `develop` de cada repo; `git push origin develop` após cada commit. Nunca em `main`.
- Front: `npm test` (vitest) e `npm run build` (Nuxt) precisam passar em cada tarefa que toca `app/`. Rodar dentro de `dev-joinvilleboasofertas` (node no host).
- API: `docker exec snap-api-dev pytest tests/jbo_public -q` verde; ao final da Parte A, `make ci` (bandit → black --check → flake8 → pytest) verde. O container roda daphne sem autoreload: após editar Python, `docker restart snap-api-dev` para o front enxergar a mudança.
- Tema: `--white` e `--navy-light` deixam de existir; critério de aceite `grep -rn "var(--white)" app` vazio. Paleta exata (copiar literalmente): `--navy #0D131D`, `--navy-2 #2A3341`, `--yellow #FFC800`, `--yellow-soft #FFF3BF`, `--yellow-ink #7A5B00`, `--red #E61E25`, `--red-soft #FDE7E8`, `--green #15803D`, `--green-soft #DCFCE7`, `--blue #0284C7`, `--blue-soft #E0F2FE`, `--bg #F3F4F6`, `--surface #FFFFFF`, `--line #E6E8EC`, `--ink #0D131D`, `--ink-2 #4B5563`, `--ink-3 #8A94A3`, `--on-dark #FFFFFF`, `--r 14px`, `--r-sm 10px`.
- Fontes: Inter 400/500/600/700 no corpo; Montserrat 700/800/900 em marca, títulos e preços. `theme-color`, `manifest.theme_color` e `manifest.background_color` = `#F3F4F6`.
- Home em vitrine só quando `q` vazio, `category_ids` e `establishment_ids` vazios, `price_min`/`price_max` nulos, `ends_today` falso e `sort === 'recent'`. Qualquer filtro → lista (comportamento atual).
- `ends_today` na API = `validity_end == timezone.localdate()` (data civil do servidor). Chave de cache das facetas passa a `jbo:offers:facets:v2`.
- Fora de escopo: `prd-*`, "Mercados que você segue", chips na página de categoria, endpoint agregado `/home`.

---

## Mapa de arquivos

### dev-snap-api (`apps/jbo_public`)

| Arquivo | Responsabilidade |
| --- | --- |
| `apps/jbo_public/services/offers.py` | `_apply_filters(ends_today)`, `list_offers(ends_today)`, facetas com `slug`, chave de cache `v2` |
| `apps/jbo_public/api.py` | parâmetro `ends_today` em `/offers` e `/offers/count` |
| `apps/jbo_public/schemas.py` | `JboFacetItemSchema.slug` |
| `tests/jbo_public/test_offers_api.py` | testes de `ends_today` e `slug` |
| `README.md` | documentar os dois campos |

### dev-joinvilleboasofertas

| Arquivo | Responsabilidade |
| --- | --- |
| `app/assets/css/tokens.css` | tokens do tema claro, base tipográfica |
| `nuxt.config.ts` | Google Fonts Inter + Montserrat, cores do PWA |
| `app/utils/promoPhase.ts` | `isEndingToday`, `formatPromoValidityLabel` → "Termina hoje" |
| `app/utils/offerBadge.ts` | `offerBadge`, `savingsPercent` (badge do canto da imagem) |
| `app/utils/categoryIcons.ts` | `CATEGORY_ICONS`, `CATEGORY_ORDER`, `categoryIcon`, `orderCategories` |
| `app/utils/homeVitrine.ts` | `isVitrineState`, `isRealSavings`, `pickHero`, `pickTopSavings` |
| `app/utils/jboApi.ts` | `JboFacets` com `slug` |
| `app/composables/useOfferFilters.ts` | `ends_today` no estado, query, params e contagem |
| `app/components/offers/OfferCard.vue` | card horizontal redesenhado (imagem + badge) |
| `app/components/offers/OfferTile.vue` | card vertical do carrossel |
| `app/components/home/HomeSection.vue` | wrapper de seção (título + aside) |
| `app/components/home/HeroSavings.vue` | hero "Maior economia da semana" |
| `app/components/home/CategoryGrid.vue` | grade de categorias com emoji |
| `app/components/home/OfferCarousel.vue` | lista horizontal com scroll-snap |
| `app/pages/index.vue` | vitrine × lista; remoção dos Stories |
| `app/pages/categoria/[slug].vue` | ícone da categoria + scroll infinito |
| `scripts/screens.cjs` | captura das telas 390×844 em `docs/screens/` |
| `README.md`, `docs/ESTRUTURA-ATUAL.md` | documentação |
| `tests/*.spec.ts` | `homeVitrine`, `categoryIcons`, `offerBadge`, `useOfferFilters`, `promoPhase` |

Varredura de tema (Tarefas 7–9) toca ainda: `AppHeader`, `HeaderMenu`, `InstallAppButton`, `IosInstallModal`, `AndroidInstallModal`, `StoreFollowConfirmModal`, `StoreFollowBell`, `SearchBar`, `SearchAutocomplete`, `FilterBar`, `FilterChipDropdown`, `FiltersSheet`, `EncarteCard`, `EncarteLightbox`, `EncarteRefBadge`, `ProductStoreBox` e todas as páginas em `app/pages/`. Localize cada um com `grep -rl "var(--white)\|--navy-light\|rgba(255, 255, 255\|rgba(255,255,255" app`.

---

# Parte A — API (`dev-snap-api`)

### Task 1: Filtro `ends_today` em `/offers` e `/offers/count`

**Files:**
- Modify: `apps/jbo_public/services/offers.py` (`_apply_filters`, `list_offers`)
- Modify: `apps/jbo_public/api.py` (`_filter_kwargs`, `offers_feed`, `offers_count`)
- Test: `tests/jbo_public/test_offers_api.py`

**Interfaces:**
- Produces: `list_offers(..., ends_today: bool = False)`; `count_offers(**filters)` aceita `ends_today` via kwargs; `GET /api/public/jbo/offers?ends_today=true` e `GET /api/public/jbo/offers/count?ends_today=true`.

- [ ] **Step 1: Teste falhando** — acrescentar ao fim de `tests/jbo_public/test_offers_api.py`:

```python
def test_ends_today_filters_by_validity_end(client, jbo_user, jbo_est, make_offer):
    """ends_today=true devolve só ofertas cuja validade termina na data civil de hoje."""
    today = timezone.localdate()
    ending = make_offer(
        user=jbo_user,
        product=_product("Hoje"),
        establishment=jbo_est,
        price=Decimal("1"),
        validity_start=today - timedelta(days=3),
        validity_end=today,
    )
    make_offer(
        user=jbo_user,
        product=_product("Amanhã"),
        establishment=jbo_est,
        price=Decimal("2"),
        validity_end=today + timedelta(days=1),
    )
    make_offer(
        user=jbo_user,
        product=_product("Ontem"),
        establishment=jbo_est,
        price=Decimal("3"),
        validity_start=today - timedelta(days=5),
        validity_end=today - timedelta(days=1),
    )
    with override_settings(JBO_ESTABLISHMENT_IDS=[str(jbo_est.id)], JBO_BBOX=None):
        filtered = client.get("/api/public/jbo/offers", {"ends_today": "true"})
        count = client.get("/api/public/jbo/offers/count", {"ends_today": "true"})
        everything = client.get("/api/public/jbo/offers")
    assert filtered.status_code == 200
    assert [i["id"] for i in filtered.json()["items"]] == [str(ending.id)]
    assert count.json()["count"] == 1
    assert len(everything.json()["items"]) == 3
```

- [ ] **Step 2: Rodar** `docker exec snap-api-dev pytest tests/jbo_public/test_offers_api.py::test_ends_today_filters_by_validity_end -q` → FAIL (`ends_today` ignorado: 3 itens em vez de 1).

- [ ] **Step 3: Implementar em `services/offers.py`** — `_apply_filters` ganha o parâmetro e o filtro; `list_offers` repassa:

```python
def _apply_filters(
    qs,
    *,
    q: Optional[str] = None,
    category_ids: Optional[list] = None,
    establishment_ids: Optional[list] = None,
    price_min: Optional[Decimal] = None,
    price_max: Optional[Decimal] = None,
    product_id: Optional[UUID] = None,
    ends_today: bool = False,
):
    """Aplica filtros opcionais sobre o queryset base (já com effective_price)."""
    ...  # filtros existentes inalterados
    if product_id is not None:
        qs = qs.filter(product_id=product_id)
    if ends_today:
        qs = qs.filter(validity_end=timezone.localdate())
    return qs
```

Em `list_offers(...)`: novo parâmetro `ends_today: bool = False` (após `product_id`) e `ends_today=ends_today` na chamada de `_apply_filters`. `count_offers(**filters)` já repassa tudo por kwargs — nada a mudar.

- [ ] **Step 4: Implementar em `api.py`**:

```python
def _filter_kwargs(
    *,
    q: Optional[str],
    category_ids: Optional[str],
    establishment_ids: Optional[str],
    price_min: Optional[float],
    price_max: Optional[float],
    sort: str,
    ends_today: bool = False,
) -> dict:
    """Monta kwargs comuns de filtro para list/count."""
    return dict(
        q=q,
        category_ids=_parse_id_list(category_ids),
        establishment_ids=_parse_id_list(establishment_ids),
        price_min=_to_decimal(price_min),
        price_max=_to_decimal(price_max),
        sort=sort or "recent",
        ends_today=bool(ends_today),
    )
```

`offers_feed` e `offers_count` ganham o parâmetro `ends_today: bool = False` (depois de `sort`) e passam `ends_today=ends_today` para `_filter_kwargs`. Atualizar a docstring de `offers_feed` para "Feed paginado de ofertas (1 por produto×supermercado); `ends_today` restringe às que vencem hoje."

- [ ] **Step 5: Rodar** `docker exec snap-api-dev pytest tests/jbo_public -q` → PASS.

- [ ] **Step 6: Commit**

```bash
cd /root/Docker/projetos/dev-snap-api
git add apps/jbo_public/services/offers.py apps/jbo_public/api.py tests/jbo_public/test_offers_api.py
git commit -m "feat(jbo): filtro ends_today em /offers e /offers/count"
git push origin develop
```

### Task 2: `slug` nas facetas + cache v2 + README

**Files:**
- Modify: `apps/jbo_public/services/offers.py` (`_FACETS_CACHE_KEY`, `_compute_offer_facets`)
- Modify: `apps/jbo_public/schemas.py` (`JboFacetItemSchema`)
- Modify: `README.md` (seção da API pública JBO)
- Test: `tests/jbo_public/test_offers_api.py`

**Interfaces:**
- Produces: `GET /offers/facets` → `{categories: [{id, name, slug}], establishments: [{id, name, slug}]}`; `slug` é `null` quando o registro não tem slug.

- [ ] **Step 1: Teste falhando** — acrescentar (import `from apps.jbo_public.services.offers import invalidate_offer_facets_cache` no topo do arquivo):

```python
def test_facets_include_slugs(client, jbo_user, jbo_est, make_offer):
    """Categorias e lojas das facetas trazem slug para montar links no front."""
    prod = _product("Facet")
    make_offer(user=jbo_user, product=prod, establishment=jbo_est, price=Decimal("2"))
    invalidate_offer_facets_cache()
    with override_settings(JBO_ESTABLISHMENT_IDS=[str(jbo_est.id)], JBO_BBOX=None):
        r = client.get("/api/public/jbo/offers/facets")
    assert r.status_code == 200
    body = r.json()
    assert body["categories"][0]["slug"] == prod.category.slug
    assert body["establishments"][0]["slug"] == (jbo_est.slug or None)
```

- [ ] **Step 2: Rodar** `docker exec snap-api-dev pytest tests/jbo_public/test_offers_api.py::test_facets_include_slugs -q` → FAIL (`KeyError: 'slug'`).

- [ ] **Step 3: Implementar** — em `schemas.py`:

```python
class JboFacetItemSchema(Schema):
    id: UUID
    name: str
    slug: Optional[str] = None
```

Em `services/offers.py`: `_FACETS_CACHE_KEY = "jbo:offers:facets:v2"` e

```python
def _compute_offer_facets() -> dict:
    """Calcula categorias e lojas (id, nome, slug) com ao menos uma oferta no escopo."""
    ids = [
        row["id"]
        for row in _latest_dated_value_rows(_with_effective_price(jbo_visible_offers()))
    ]
    if not ids:
        return {"categories": [], "establishments": []}
    categories: dict = {}
    establishments: dict = {}
    for row in Offer.objects.filter(pk__in=ids).values(
        "product__category_id",
        "product__category__name",
        "product__category__slug",
        "establishment_id",
        "establishment__name",
        "establishment__slug",
    ):
        cat_id = row["product__category_id"]
        if cat_id:
            categories[cat_id] = {
                "name": row["product__category__name"],
                "slug": row["product__category__slug"] or None,
            }
        establishments[row["establishment_id"]] = {
            "name": row["establishment__name"],
            "slug": row["establishment__slug"] or None,
        }
    return {
        "categories": [
            {"id": k, "name": v["name"], "slug": v["slug"]}
            for k, v in sorted(categories.items(), key=lambda x: x[1]["name"])
        ],
        "establishments": [
            {"id": k, "name": v["name"], "slug": v["slug"]}
            for k, v in sorted(establishments.items(), key=lambda x: x[1]["name"])
        ],
    }
```

- [ ] **Step 4: Rodar** `docker exec snap-api-dev pytest tests/jbo_public -q` → PASS. Depois `cd /root/Docker/projetos/dev-snap-api && make ci` → verde (black pode reformatar; commitar o resultado).

- [ ] **Step 5: README** — em `dev-snap-api/README.md`, na parte que descreve `/api/public/jbo` (buscar `offers/facets`; se não houver seção, criar "### API pública JBO" logo após a seção de ofertas/Mega Brain), acrescentar:

```markdown
- `GET /api/public/jbo/offers` e `/offers/count` aceitam `ends_today=true` (só ofertas cuja
  validade termina na data civil de hoje, `TIME_ZONE` do Django); combina com os demais filtros.
- `GET /api/public/jbo/offers/facets` devolve `slug` em categorias e lojas (cache `jbo:offers:facets:v2`, 300 s).
```

- [ ] **Step 6: Commit**

```bash
git add apps/jbo_public/services/offers.py apps/jbo_public/schemas.py tests/jbo_public/test_offers_api.py README.md
git commit -m "feat(jbo): slug nas facetas de ofertas e cache v2"
git push origin develop
docker restart snap-api-dev
```

---

# Parte B — Fase 1: tema claro (`dev-joinvilleboasofertas`)

Sequência obrigatória antes de codar: `cd /root/Docker/projetos/dev-joinvilleboasofertas && git checkout develop && git fetch origin && git pull --ff-only origin develop && npm test`.

### Task 3: Tokens do tema claro e fontes

**Files:**
- Modify: `app/assets/css/tokens.css` (reescrever)
- Modify: `nuxt.config.ts` (fontes, `theme-color`, manifest)

**Interfaces:**
- Produces: variáveis `--navy --navy-2 --yellow --yellow-soft --yellow-ink --red --red-soft --green --green-soft --blue --blue-soft --bg --surface --line --ink --ink-2 --ink-3 --on-dark --border --muted --upcoming --upcoming-light --r --r-sm --shadow --head --body`. Todas as tarefas seguintes só usam esses nomes.

- [ ] **Step 1: Reescrever `app/assets/css/tokens.css`** com exatamente:

```css
:root {
  /* marca */
  --navy: #0D131D;
  --navy-2: #2A3341;
  --yellow: #FFC800;
  --yellow-soft: #FFF3BF;
  --yellow-ink: #7A5B00;
  --red: #E61E25;
  --red-soft: #FDE7E8;
  --green: #15803D;
  --green-soft: #DCFCE7;
  --blue: #0284C7;
  --blue-soft: #E0F2FE;
  /* superfícies e texto */
  --bg: #F3F4F6;
  --surface: #FFFFFF;
  --line: #E6E8EC;
  --ink: #0D131D;
  --ink-2: #4B5563;
  --ink-3: #8A94A3;
  --on-dark: #FFFFFF; /* texto sobre navy/vermelho */
  /* apelidos mantidos */
  --border: var(--line);
  --muted: var(--ink-3);
  --upcoming: var(--blue);
  --upcoming-light: var(--blue);
  /* forma */
  --r: 14px;
  --r-sm: 10px;
  --shadow: 0 1px 2px rgba(13, 19, 29, 0.05), 0 4px 14px rgba(13, 19, 29, 0.06);
  --head: "Montserrat", system-ui, sans-serif;
  --body: "Inter", system-ui, sans-serif;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
}

body {
  font-family: var(--body);
  background: var(--bg);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}

h1,
h2,
h3 {
  font-family: var(--head);
}

a {
  color: var(--blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

button {
  font-family: inherit;
}

img {
  max-width: 100%;
  height: auto;
}
```

- [ ] **Step 2: `nuxt.config.ts`** — trocar o `link` de fontes e as cores:

```ts
{ name: 'theme-color', content: '#F3F4F6' },
...
{
  rel: 'stylesheet',
  href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@700;800;900&display=swap',
},
...
manifest: {
  ...
  background_color: '#F3F4F6',
  theme_color: '#F3F4F6',
```

- [ ] **Step 3: Verificar** `npm run build` → OK (o site fica temporariamente com texto branco em fundo claro em vários componentes; isso é corrigido nas Tarefas 7–10).

- [ ] **Step 4: Commit**

```bash
git add app/assets/css/tokens.css nuxt.config.ts
git commit -m "feat(tema): tokens do tema claro, Inter + Montserrat e cores do PWA"
git push origin develop
```

### Task 4: `isEndingToday` e rótulo "Termina hoje"

**Files:**
- Modify: `app/utils/promoPhase.ts`
- Test: `tests/promoPhase.spec.ts`

**Interfaces:**
- Produces: `isEndingToday(offer: { promo_starts_on?, promo_ends_on? }, now = new Date()): boolean`; `formatPromoValidityLabel` devolve `'Termina hoje'` quando a promo vigente termina na data civil de hoje (America/Sao_Paulo). `formatValidUntil` de `relativeTime.ts` não muda.

- [ ] **Step 1: Testes falhando** — acrescentar em `tests/promoPhase.spec.ts` (`isEndingToday` no import):

```ts
  it('rotula Termina hoje quando a promo vence na data civil de hoje', () => {
    const offer = { promo_starts_on: '2026-08-15', promo_ends_on: '2026-08-19' }
    expect(isEndingToday(offer, now)).toBe(true)
    expect(formatPromoValidityLabel(offer, now)).toBe('Termina hoje')
  })

  it('usa a data civil de São Paulo, não o UTC', () => {
    const lateNightUtc = new Date('2026-08-20T01:00:00.000Z') // 22h do dia 19 em Joinville
    const offer = { promo_ends_on: '2026-08-19' }
    expect(isEndingToday(offer, lateNightUtc)).toBe(true)
  })

  it('não é Termina hoje quando vence amanhã, já venceu ou ainda não começou', () => {
    expect(isEndingToday({ promo_ends_on: '2026-08-20' }, now)).toBe(false)
    expect(formatPromoValidityLabel({ promo_ends_on: '2026-08-20' }, now)).toBe('Válido até amanhã')
    expect(isEndingToday({ promo_ends_on: '2026-08-18' }, now)).toBe(false)
    expect(isEndingToday({ promo_starts_on: '2026-08-25', promo_ends_on: '2026-08-25' }, now)).toBe(false)
    expect(isEndingToday({ promo_ends_on: null }, now)).toBe(false)
  })
```

- [ ] **Step 2: Rodar** `npx vitest run tests/promoPhase.spec.ts` → FAIL (`isEndingToday is not a function`).

- [ ] **Step 3: Implementar** em `app/utils/promoPhase.ts`:

```ts
/** True quando a promo está vigente e termina na data civil de hoje (Joinville). */
export function isEndingToday(offer: PromoDates, now = new Date()): boolean {
  if (!offer.promo_ends_on) return false
  const end = parseDateOnly(offer.promo_ends_on)
  if (!end) return false
  if (getPromoPhase(offer, now) !== 'active') return false
  return daysBetween(civilToday(now), end) === 0
}
```

e em `formatPromoValidityLabel`, antes do `return formatValidUntil(...)` final:

```ts
  if (isEndingToday(offer, now)) return 'Termina hoje'
```

- [ ] **Step 4: Rodar** `npm test` → PASS (todos os specs).

- [ ] **Step 5: Commit**

```bash
git add app/utils/promoPhase.ts tests/promoPhase.spec.ts
git commit -m "feat(promo): isEndingToday e rótulo Termina hoje"
git push origin develop
```

### Task 5: `offerBadge.ts`

**Files:**
- Create: `app/utils/offerBadge.ts`
- Test: `tests/offerBadge.spec.ts`

**Interfaces:**
- Consumes: `getPromoPhase` (promoPhase.ts), `offerMainPrice` (offerPrice.ts), `clubBadgeLabel` (jboApi.ts).
- Produces: `type OfferBadge = { kind: 'expired' | 'upcoming' | 'savings' | 'club', label: string, club: boolean }`; `offerBadge(offer, now = new Date()): OfferBadge | null`; `savingsPercent(offer): number` (inteiro positivo; 0 sem economia).

- [ ] **Step 1: Teste falhando** — criar `tests/offerBadge.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { offerBadge, savingsPercent } from '../app/utils/offerBadge'

const now = new Date('2026-09-11T15:00:00.000Z')
const active = { promo_starts_on: '2026-09-08', promo_ends_on: '2026-09-14' }

describe('savingsPercent', () => {
  it('arredonda e devolve positivo só quando há economia', () => {
    expect(savingsPercent({ diff_percent: -28.4 })).toBe(28)
    expect(savingsPercent({ diff_percent: -0.4 })).toBe(0)
    expect(savingsPercent({ diff_percent: 12 })).toBe(0)
    expect(savingsPercent({ diff_percent: undefined })).toBe(0)
  })
})

describe('offerBadge', () => {
  it('expirado', () => {
    expect(offerBadge({ ...active, promo_ends_on: '2026-09-10', price: '10', diff_percent: -30 }, now))
      .toEqual({ kind: 'expired', label: 'EXPIRADO', club: false })
  })

  it('em breve', () => {
    expect(offerBadge({ promo_starts_on: '2026-09-20', promo_ends_on: '2026-09-25', price: '10', diff_percent: -30 }, now))
      .toEqual({ kind: 'upcoming', label: 'EM BREVE', club: false })
  })

  it('economia no preço regular', () => {
    expect(offerBadge({ ...active, price: '10', diff_percent: -28.4 }, now))
      .toEqual({ kind: 'savings', label: '-28%', club: false })
  })

  it('economia com preço de clube', () => {
    expect(offerBadge({ ...active, price: '12', club_price: '9.99', diff_percent: -28 }, now))
      .toEqual({ kind: 'savings', label: 'CLUBE -28%', club: true })
  })

  it('só clube usa o rótulo do programa da loja', () => {
    expect(offerBadge({ ...active, club_price: '9.99', diff_percent: 0, establishment_loyalty_program_name: 'Cooperado' }, now))
      .toEqual({ kind: 'club', label: 'COOPERADO', club: true })
    expect(offerBadge({ ...active, club_price: '9.99', diff_percent: 0 }, now))
      .toEqual({ kind: 'club', label: 'CLUBE', club: true })
  })

  it('sem badge quando não há economia nem clube', () => {
    expect(offerBadge({ ...active, price: '10', diff_percent: 0 }, now)).toBeNull()
    expect(offerBadge({ ...active, price: '10', diff_percent: 5 }, now)).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar** `npx vitest run tests/offerBadge.spec.ts` → FAIL (módulo inexistente).

- [ ] **Step 3: Implementar** `app/utils/offerBadge.ts`:

```ts
/** Badge do canto da imagem do card: fase da promo, economia e preço de clube. */

import { clubBadgeLabel, type JboOffer } from '~/utils/jboApi'
import { offerMainPrice } from '~/utils/offerPrice'
import { getPromoPhase } from '~/utils/promoPhase'

export type OfferBadgeKind = 'expired' | 'upcoming' | 'savings' | 'club'

export type OfferBadge = {
  kind: OfferBadgeKind
  /** Texto curto em caixa alta: "EXPIRADO", "EM BREVE", "-28%", "CLUBE -28%", "CLUBE". */
  label: string
  /** True quando o preço principal é o de clube (badge amarelo). */
  club: boolean
}

type BadgeSource = Pick<
  JboOffer,
  'price' | 'club_price' | 'is_club_price' | 'establishment_loyalty_program_name'
  | 'diff_percent' | 'promo_starts_on' | 'promo_ends_on'
>

/** Percentual de economia contra a média, arredondado e positivo; 0 quando não há economia. */
export function savingsPercent(offer: Pick<JboOffer, 'diff_percent'>): number {
  const pct = Number(offer.diff_percent)
  if (!Number.isFinite(pct) || pct >= 0) return 0
  return Math.abs(Math.round(pct))
}

/** Decide o badge da oferta; null quando não há nada a destacar. */
export function offerBadge(offer: BadgeSource, now = new Date()): OfferBadge | null {
  const phase = getPromoPhase(offer, now)
  if (phase === 'expired') return { kind: 'expired', label: 'EXPIRADO', club: false }
  if (phase === 'upcoming') return { kind: 'upcoming', label: 'EM BREVE', club: false }

  const isClub = Boolean(offerMainPrice(offer)?.isClub)
  const pct = savingsPercent(offer)
  if (pct > 0) {
    return { kind: 'savings', label: isClub ? `CLUBE -${pct}%` : `-${pct}%`, club: isClub }
  }
  if (isClub) {
    return { kind: 'club', label: clubBadgeLabel(offer).toUpperCase(), club: true }
  }
  return null
}
```

- [ ] **Step 4: Rodar** `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add app/utils/offerBadge.ts tests/offerBadge.spec.ts
git commit -m "feat(ofertas): offerBadge decide o selo do card (fase, economia, clube)"
git push origin develop
```

### Task 6: `categoryIcons.ts`

**Files:**
- Create: `app/utils/categoryIcons.ts`
- Test: `tests/categoryIcons.spec.ts`

**Interfaces:**
- Produces: `type CategoryIcon = { emoji: string, bg: string }`; `CATEGORY_ICONS: Record<string, CategoryIcon>`; `CATEGORY_ORDER: string[]`; `categoryIcon(slug): CategoryIcon` (fallback `{ emoji: '🛒', bg: '#EEF0F3' }`); `orderCategories<T extends { slug?: string | null, name: string }>(list: T[]): T[]` — ordem do protótipo, desconhecidos por nome depois dos conhecidos, `outros` por último.

- [ ] **Step 1: Teste falhando** — `tests/categoryIcons.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CATEGORY_ORDER, categoryIcon, orderCategories } from '../app/utils/categoryIcons'

describe('categoryIcons', () => {
  it('ordem do protótipo começa em açougue e termina em outros', () => {
    expect(CATEGORY_ORDER[0]).toBe('acougue')
    expect(CATEGORY_ORDER[CATEGORY_ORDER.length - 1]).toBe('outros')
    expect(CATEGORY_ORDER).toHaveLength(13)
  })

  it('ícone conhecido e fallback', () => {
    expect(categoryIcon('hortifruti')).toEqual({ emoji: '🥦', bg: '#DCFCE7' })
    expect(categoryIcon('Hortifruti ')).toEqual({ emoji: '🥦', bg: '#DCFCE7' })
    expect(categoryIcon('inexistente')).toEqual({ emoji: '🛒', bg: '#EEF0F3' })
    expect(categoryIcon(null)).toEqual({ emoji: '🛒', bg: '#EEF0F3' })
  })

  it('ordena pelo protótipo, desconhecidos por nome e outros por último', () => {
    const ordered = orderCategories([
      { slug: 'outros', name: 'Outros' },
      { slug: 'zeta', name: 'Zeta' },
      { slug: 'bebidas', name: 'Bebidas' },
      { slug: 'alfa', name: 'Alfa' },
      { slug: 'acougue', name: 'Açougue' },
    ])
    expect(ordered.map(c => c.slug)).toEqual(['acougue', 'bebidas', 'alfa', 'zeta', 'outros'])
  })
})
```

- [ ] **Step 2: Rodar** `npx vitest run tests/categoryIcons.spec.ts` → FAIL.

- [ ] **Step 3: Implementar** `app/utils/categoryIcons.ts`:

```ts
/** Emoji e fundo suave por slug de categoria (ordem e cores do protótipo). */

export type CategoryIcon = { emoji: string, bg: string }

export const CATEGORY_ICONS: Record<string, CategoryIcon> = {
  acougue: { emoji: '🥩', bg: '#FDE7E8' },
  hortifruti: { emoji: '🥦', bg: '#DCFCE7' },
  laticinios: { emoji: '🧀', bg: '#FFF3BF' },
  bebidas: { emoji: '🧃', bg: '#E0F2FE' },
  padaria: { emoji: '🥖', bg: '#FFEDD5' },
  limpeza: { emoji: '🧴', bg: '#EDE9FE' },
  higiene: { emoji: '🧼', bg: '#FCE7F3' },
  mercearia: { emoji: '🛒', bg: '#EEF0F3' },
  congelados: { emoji: '🧊', bg: '#E0F2FE' },
  frios: { emoji: '🥓', bg: '#FDE7E8' },
  bebe: { emoji: '🍼', bg: '#FCE7F3' },
  pet: { emoji: '🐾', bg: '#FFEDD5' },
  outros: { emoji: '🧺', bg: '#EEF0F3' },
}

/** Ordem de exibição do protótipo; "outros" fica por último. */
export const CATEGORY_ORDER = Object.keys(CATEGORY_ICONS)

const FALLBACK: CategoryIcon = { emoji: '🛒', bg: '#EEF0F3' }
const LAST = 'outros'

/** Normaliza o slug (caixa baixa, sem espaços nas pontas). */
function normalizeSlug(slug: string | null | undefined): string {
  return String(slug || '').trim().toLowerCase()
}

/** Ícone da categoria; carrinho cinza quando o slug é desconhecido. */
export function categoryIcon(slug: string | null | undefined): CategoryIcon {
  return CATEGORY_ICONS[normalizeSlug(slug)] || FALLBACK
}

type CategoryLike = { slug?: string | null, name: string }

/** Posição de ordenação: conhecidos pelo protótipo, desconhecidos depois, "outros" por último. */
function rank(category: CategoryLike): number {
  const slug = normalizeSlug(category.slug)
  if (slug === LAST) return CATEGORY_ORDER.length + 1
  const index = CATEGORY_ORDER.indexOf(slug)
  return index === -1 ? CATEGORY_ORDER.length : index
}

/** Ordena categorias para a grade da home sem mutar a lista original. */
export function orderCategories<T extends CategoryLike>(categories: T[]): T[] {
  return [...categories].sort((a, b) =>
    rank(a) - rank(b) || a.name.localeCompare(b.name, 'pt-BR'),
  )
}
```

- [ ] **Step 4: Rodar** `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add app/utils/categoryIcons.ts tests/categoryIcons.spec.ts
git commit -m "feat(categorias): mapa de emoji/cor por slug e ordenação do protótipo"
git push origin develop
```

### Regras da varredura de tema (valem para as Tarefas 7, 8 e 9)

Aplicar linha a linha, em `<style>` e em classes inline, sem mudar DOM, props, eventos ou lógica:

| Antes | Depois |
| --- | --- |
| `var(--white)` como cor de texto principal | `var(--ink)` |
| `var(--white)` como texto secundário / `rgba(255, 255, 255, 0.55–0.85)` em texto | `var(--ink-2)` (0.75–0.9) ou `var(--ink-3)` (≤ 0.65) |
| `var(--white)` / `#fff` sobre fundo navy, vermelho ou azul (hero, badge, botão primário, chip ativo) | `var(--on-dark)` (manter o fundo escuro) |
| `rgba(255, 255, 255, 0.08–0.2)` em `border` | `var(--line)` |
| `rgba(255, 255, 255, 0.x)` em `background` de hover, chip, pill | `var(--bg)` |
| `rgba(255, 200, 0, 0.12–0.15)` em background (destaque amarelo) | `var(--yellow-soft)`; o texto amarelo ao lado vira `var(--yellow-ink)` |
| `var(--navy)`, `var(--navy-light)`, `#151d2b`, `#0a1018`, `#2b3546`, `rgba(13, 19, 29, 0.x)` em background de card, popover, sheet, modal, header, filterbar, botão de ícone | `var(--surface)` + `border: 1px solid var(--line)`; popover/modal/sheet somam `box-shadow: var(--shadow)` |
| `var(--navy)` como marca (hero, botão primário "Aplicar"/CTA já amarelo, chip ativo, fallback de logo) | manter |
| `var(--yellow)` como cor de texto (preço, título de seção, link de card, ícone de botão) | `var(--ink)` para preço/título; `var(--ink-2)` para ícone; links/CTAs de texto `var(--blue)` |
| `border-color: var(--yellow)` em hover/focus de card ou botão neutro | `border-color: var(--ink-3)`; `outline` de foco continua `var(--yellow)` |
| `#3a4454` (badge/stripe expirado) | fundo `#EEF0F3`, texto `var(--ink-2)` |
| `var(--upcoming)` fundo de badge "Em breve" | fundo `var(--blue-soft)`, texto `var(--blue)` |
| `var(--upcoming-light)` | `var(--blue)` |
| overlay escuro atrás de modal/lightbox (`rgba(13,19,29,.9x)`, `rgba(0,0,0,.x)`) | manter |
| `box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45)` | `var(--shadow)` |
| `var(--muted)`, `var(--border)`, `var(--surface)` | manter (já remapeados nos tokens) |

Verificação ao fim de cada tarefa de varredura (nos arquivos da tarefa):

```bash
grep -n "var(--white)\|--navy-light\|--upcoming-light\|#151d2b\|#0a1018\|#2b3546\|#3a4454\|rgba(255, 255, 255\|rgba(255,255,255\|rgba(255, 200, 0, 0\.1" <arquivos>
```

deve devolver vazio; `npm run build` OK; conferir visualmente em `http://localhost:8092` (`docker compose up -d` neste repo) ou com a receita de screenshot da Tarefa 18.

### Task 7: Varredura — shell, navegação, busca e filtros

**Files:**
- Modify: `app/components/AppHeader.vue`, `app/components/HeaderMenu.vue`, `app/components/StoreFollowBell.vue`, `app/components/offers/FilterBar.vue`, `app/components/offers/FilterChipDropdown.vue`, `app/components/offers/SearchBar.vue`, `app/components/offers/FiltersSheet.vue`
- Modify (localizar com `grep -rl`): `SearchAutocomplete.vue`, `InstallAppButton.vue`, `IosInstallModal.vue`, `AndroidInstallModal.vue`, `StoreFollowConfirmModal.vue`

- [ ] **Step 1: `AppHeader.vue`** — `.header { background: var(--surface); border-bottom: 1px solid var(--line); }` (remover `backdrop-filter`). Barra de loading continua `var(--yellow)`.

- [ ] **Step 2: `HeaderMenu.vue`** —

```css
.hmenu__trigger { border: 1px solid var(--line); background: var(--surface); color: var(--ink); }
.hmenu__trigger:hover, .hmenu__trigger[aria-expanded="true"] { border-color: var(--ink-3); }
.hmenu__panel { background: var(--surface); border: 1px solid var(--line); box-shadow: var(--shadow); }
.hmenu__item { color: var(--ink); }
.hmenu__item:hover, .hmenu__item.router-link-active { background: var(--yellow-soft); color: var(--yellow-ink); }
```

- [ ] **Step 3: `StoreFollowBell.vue`** — `.store-bell__btn { border: 1px solid var(--line); background: var(--surface); color: var(--ink-2); }`, `.store-bell__btn[aria-pressed="true"] { background: var(--yellow-soft); border-color: var(--yellow); color: var(--yellow-ink); }`, hover `border-color: var(--ink-3)`, hint `color: var(--ink-3)`.

- [ ] **Step 4: `FilterChipDropdown.vue`** — gatilho vira pill e o painel fica claro:

```css
.chipdd__trigger {
  display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px;
  background: var(--surface); border: 1px solid var(--line); border-radius: 999px;
  font: inherit; font-size: 13px; font-weight: 600; color: var(--ink-2); cursor: pointer; white-space: nowrap;
}
.chipdd__trigger--active { background: var(--navy); border-color: var(--navy); color: var(--on-dark); font-weight: 600; }
.chipdd__badge { background: var(--yellow); color: var(--navy); ... } /* inalterado */
.chipdd__panel { background: var(--surface); border: 1px solid var(--line); box-shadow: var(--shadow); color: var(--ink); ... }
```

- [ ] **Step 5: `FilterBar.vue`** —

```css
.filterbar { padding: 10px 16px; background: var(--bg); border-bottom: 0; } /* sem backdrop-filter */
.filterbar__chips { gap: 8px; }
/* remover a regra .filterbar__chips > * + * { border-left } */
.popover__title { color: var(--ink-3); }
.popover__search-input { border: 1px solid var(--line); color: var(--ink); background: var(--surface); }
.popover__search-input:focus { border-color: var(--yellow); }
.popover__opt { border: 1px solid var(--line); color: var(--ink); }
.popover__opt--on { background: var(--yellow-soft); border-color: var(--yellow); color: var(--yellow-ink); }
.popover__actions { border-top: 1px solid var(--line); }
.popover__clear { border: 1px solid var(--line); color: var(--ink); }
.popover__apply { background: var(--yellow); color: var(--navy); } /* inalterado */
.popover__empty { color: var(--ink-3); }
```

- [ ] **Step 6: `SearchBar.vue` + `SearchAutocomplete.vue`** — o campo segue `.search` do protótipo: `height: 50px; border-radius: 16px; background: var(--surface); border: 1px solid var(--line); box-shadow: var(--shadow); color: var(--ink); padding: 0 14px;` placeholder `var(--ink-3)`; lista de sugestões `background: var(--surface); border: 1px solid var(--line); box-shadow: var(--shadow); color: var(--ink)`; item ativo `background: var(--bg)`.

- [ ] **Step 7: `FiltersSheet.vue`, `InstallAppButton.vue`, `IosInstallModal.vue`, `AndroidInstallModal.vue`, `StoreFollowConfirmModal.vue`** — aplicar a tabela: painel/sheet `var(--surface)` + `var(--line)` + `var(--shadow)`, overlay mantido, título `var(--ink)`, texto `var(--ink-2)`, botão secundário "Agora não" `background: var(--surface); border: 1px solid var(--line); color: var(--ink)`, botão primário mantém amarelo/navy ou navy/on-dark.

- [ ] **Step 8: Verificar** — grep da seção "Regras" vazio nesses arquivos; `npm run build` OK; `npm test` PASS.

- [ ] **Step 9: Commit**

```bash
git add app/components
git commit -m "feat(tema): header, menu, busca, filtros, sino e modais no tema claro"
git push origin develop
```

### Task 8: Varredura — encartes, lojas, categoria e páginas de texto

**Files:**
- Modify: `app/components/encartes/EncarteCard.vue`, `app/components/encartes/EncarteLightbox.vue`, `app/components/encartes/EncarteRefBadge.vue` (ou onde o grep achar), `app/pages/encartes.vue`, `app/pages/encarte/[id].vue`, `app/pages/lojas.vue`, `app/pages/loja/[slug].vue`, `app/pages/categoria/[slug].vue`, `app/pages/envie-um-encarte.vue`, `app/pages/perguntas-frequentes.vue`, `app/pages/privacidade.vue`, `app/pages/termos.vue`, `app/pages/index.vue` (só cores)

- [ ] **Step 1: `EncarteCard.vue`** —

```css
.card { border: 1px solid var(--line); background: var(--surface); color: var(--ink); }
.card:hover, .card:focus-within { border-color: var(--ink-3); }
.card__media { background: #EEF0F3; }
.card__placeholder { color: var(--ink-3); }
.card__bell, .card__share { border: 1px solid var(--line); background: var(--surface); color: var(--ink-2); }
.card__bell[aria-pressed="true"] { background: var(--yellow-soft); border-color: var(--yellow); color: var(--yellow-ink); }
.card__bell-hint { border: 1px solid var(--line); background: var(--surface); color: var(--ink); }
.card__logo--fallback { background: var(--navy); color: var(--on-dark); }
.card__dates, .card__registered, .card__copied { color: var(--ink-3); }
.card__dates--expired { color: var(--ink-3); }
.card__dates--upcoming { color: var(--blue); }
.card__dates--hot { color: var(--red); font-weight: 600; }
.card__badge--expired { background: #EEF0F3; color: var(--ink-2); }
.card__badge--upcoming { background: var(--blue-soft); color: var(--blue); }
.card__badge--hot { background: var(--red-soft); color: var(--red); }
```

No template: `:class` de `.card__dates` ganha `'card__dates--hot': endingToday`; após o badge "Em breve" acrescentar `<span v-else-if="endingToday" class="card__badge card__badge--hot">Termina hoje</span>`. No script: `import { formatPromoValidityLabel, getPromoPhase, isEndingToday, isPromoExpired } from '~/utils/promoPhase'` e `const endingToday = computed(() => isEndingToday(props.encarte))`.

- [ ] **Step 2: `pages/encarte/[id].vue`** — `.bell, .share { border: 1px solid var(--line); background: var(--surface); color: var(--ink-2); }`, `.bell[aria-pressed="true"] { background: var(--yellow-soft); border-color: var(--yellow); color: var(--yellow-ink); }`, hover `border-color: var(--ink-3)`; `.meta__store:hover { color: var(--ink); }`; `.validity--expired { color: var(--ink-3); }`; `.validity--upcoming { color: var(--blue); }`; `.phase-badge--expired { background: #EEF0F3; color: var(--ink-2); }`; `.phase-badge--upcoming { background: var(--blue-soft); color: var(--blue); }`; `.photo__img { border: 1px solid var(--line); }`; `.section-heading { color: var(--ink); }`; `.offers__locate { color: var(--blue); }`. Acrescentar `<p v-else-if="endingToday" class="phase-badge phase-badge--hot">Termina hoje</p>` com `.phase-badge--hot { background: var(--red-soft); color: var(--red); }` e `const endingToday = computed(() => encarte.value ? isEndingToday(encarte.value) : false)`.

- [ ] **Step 3: `EncarteLightbox.vue`, `EncarteRefBadge.vue`, `pages/encartes.vue`** — lightbox mantém overlay escuro e texto `var(--on-dark)` dentro dele; botões flutuantes sobre a foto continuam escuros com `var(--on-dark)`; hotspot ativo continua amarelo. Fora do overlay (grid, intro, CTA "Envie um encarte", botão "Carregar mais"): tabela. `EncarteRefBadge`: fundo `rgba(13, 19, 29, 0.85)` + `var(--on-dark)` sobre a imagem pode ficar; se estiver fora da imagem, `var(--surface)` + `var(--line)` + `var(--ink-2)`.

- [ ] **Step 4: `pages/lojas.vue`, `pages/loja/[slug].vue`, `pages/categoria/[slug].vue`, `pages/index.vue`** — tabela. Em `lojas.vue` a linha da loja vira `.store-row` do protótipo: `padding: 12px 0; border-bottom: 1px solid var(--line)`, nome 700 14px `var(--ink)`, endereço 12px `var(--ink-3)`, iniciais de logo `background: var(--navy); color: var(--on-dark)`. Em `index.vue` só `.home__empty button, .home__error button` (mantém amarelo) e `color: var(--muted)` dos estados (já remapeado) — o resto muda na Tarefa 16.

- [ ] **Step 5: `pages/envie-um-encarte.vue`, `pages/perguntas-frequentes.vue`, `pages/privacidade.vue`, `pages/termos.vue`** — tabela; inputs/selects `height: 46px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); color: var(--ink)`; `<details>` da FAQ com `border-bottom: 1px solid var(--line)` e summary `var(--ink)`; botão de envio `background: var(--navy); color: var(--on-dark)`.

- [ ] **Step 6: Verificar** grep vazio nos arquivos da tarefa; `npm run build`; `npm test`.

- [ ] **Step 7: Commit**

```bash
git add app/components/encartes app/pages
git commit -m "feat(tema): encartes, lojas, categoria e páginas de texto no tema claro"
git push origin develop
```

### Task 9: Varredura — página de produto

**Files:**
- Modify: `app/pages/produto/[slug]/[[loja]].vue`, `app/components/ProductStoreBox.vue` (ou onde o grep achar)

- [ ] **Step 1: Página do produto** — tabela em todos os usos (a página tem ~56 ocorrências). Regras específicas: eyebrow da categoria `var(--ink-2)` 600; título `var(--ink)`; bloco do recorte do encarte `background: var(--surface); border: 1px solid var(--line); border-radius: 20px`; preço grande `font: 900 34px var(--head); color: var(--ink)`; regular/média riscados `var(--ink-3)`; badge de clube `background: var(--yellow-soft); color: var(--yellow-ink)`; pill de validade `var(--blue-soft)/var(--blue)` (ou `var(--red-soft)/var(--red)` quando `isEndingToday`); "Ver encarte completo" `background: var(--surface); border: 1px solid var(--line); color: var(--ink)`; seção "Onde encontrar" = `.compare .r` do protótipo: linhas `background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px`, a linha do melhor preço (`cheapest`) `border-color: var(--yellow); background: var(--yellow-soft)` com legenda "Melhor preço" em `var(--yellow-ink)`; "Link copiado" `var(--ink-3)`; empty do recorte `var(--ink-3)`.

- [ ] **Step 2: `ProductStoreBox.vue`** — caixa `background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); box-shadow: var(--shadow)`; nome da loja `font: 800 15px var(--head); color: var(--ink)`; endereços `var(--ink-3)`; links de endereço `var(--blue)`.

- [ ] **Step 3: Verificar** grep vazio nesses arquivos; `npm run build`; `npm test`; abrir `/produto/{slug}/{loja}` de uma oferta com clube e de uma sem.

- [ ] **Step 4: Commit**

```bash
git add app/pages/produto app/components
git commit -m "feat(tema): página de produto e caixa da loja no tema claro"
git push origin develop
```

### Task 10: `OfferCard` horizontal redesenhado

**Files:**
- Modify: `app/components/offers/OfferCard.vue` (reescrever template, script e estilo)

**Interfaces:**
- Consumes: `offerBadge` (Task 5), `categoryIcon` (Task 6), `isEndingToday` (Task 4), `formatOfferPriceParts`, `formatOfferSubtitle`, `formatUnitPrice`, `formatMoney`, `offerChips` (offerPrice.ts), `clubBadgeLabel`, `productOfferPath` (jboApi.ts).
- Produces: mesma API pública do componente — props `offer: JboOffer`, `hideStore?: boolean`. Usado em `index.vue`, `loja/[slug].vue`, `categoria/[slug].vue`, `encarte/[id].vue`, `produto/...`.

- [ ] **Step 1: Template**

```vue
<template>
  <NuxtLink
    class="deal"
    :class="{ 'deal--expired': isExpired }"
    :to="productHref"
  >
    <div class="deal__media" :style="mediaStyle">
      <img
        v-if="offer.image_url"
        class="deal__img"
        :src="offer.image_url"
        :alt="offer.product_name"
        loading="lazy"
      >
      <span v-else class="deal__emoji" aria-hidden="true">{{ icon.emoji }}</span>
      <span v-if="badge" class="deal__badge" :class="badgeClass">{{ badge.label }}</span>
    </div>

    <div class="deal__body">
      <div v-if="offer.category_name" class="deal__category">
        {{ offer.category_name }}
      </div>
      <div class="deal__name">
        {{ offer.product_name }}
      </div>
      <div v-if="subtitle" class="deal__subtitle">
        {{ subtitle }}
      </div>
      <div class="deal__price">
        <span class="deal__price-now">
          <span v-if="priceParts.prefix" class="deal__price-small">{{ priceParts.prefix }} </span>{{ priceParts.amount }}<span
            v-if="priceParts.suffix"
            class="deal__price-small"
          >{{ priceParts.suffix }}</span>
        </span>
        <s
          v-if="priceParts.regular"
          class="deal__was"
          :title="`${priceParts.regular} sem o ${clubLabel}`"
        >{{ priceParts.regular }}</s>
        <s
          v-else-if="hasSavings && avgLabel"
          class="deal__was"
          :title="`Média nos mercados: ${avgLabel}`"
        >{{ avgLabel }}</s>
      </div>
      <div v-if="priceParts.each || unitPriceLabel" class="deal__secondary">
        <span v-if="priceParts.each">{{ priceParts.each }}</span>
        <span v-if="unitPriceLabel">{{ unitPriceLabel }}</span>
      </div>
      <div v-if="!hideStore" class="deal__store">
        <img
          v-if="offer.establishment_logo_url"
          class="deal__store-logo"
          :src="offer.establishment_logo_url"
          :alt="`Logo ${offer.establishment_name}`"
          loading="lazy"
        >
        <span>{{ offer.establishment_name }}</span>
      </div>
      <p
        v-if="validityLabel"
        class="deal__validity"
        :class="{
          'deal__validity--hot': endingToday,
          'deal__validity--expired': isExpired,
          'deal__validity--upcoming': isUpcoming,
        }"
      >
        {{ validityLabel }}
      </p>
      <ul v-if="chips.length" class="deal__chips" aria-label="Condições da oferta">
        <li
          v-for="chip in chips"
          :key="chip.key"
          class="deal__chip"
          :class="`deal__chip--${chip.key}`"
          :title="chip.title"
        >
          {{ chip.label }}
        </li>
      </ul>
    </div>
  </NuxtLink>
</template>
```

- [ ] **Step 2: Script**

```ts
<script setup lang="ts">
import { categoryIcon } from '~/utils/categoryIcons'
import { clubBadgeLabel, productOfferPath, type JboOffer } from '~/utils/jboApi'
import { offerBadge } from '~/utils/offerBadge'
import {
  formatMoney,
  formatOfferPriceParts,
  formatOfferSubtitle,
  formatUnitPrice,
  offerChips,
} from '~/utils/offerPrice'
import {
  formatPromoValidityLabel,
  getPromoPhase,
  isEndingToday,
  isPromoExpired,
} from '~/utils/promoPhase'

const props = withDefaults(defineProps<{
  offer: JboOffer
  /** Esconde logo/nome da loja (ex.: já no título da seção). */
  hideStore?: boolean
}>(), {
  hideStore: false,
})

const clubLabel = computed(() => clubBadgeLabel(props.offer))
const productHref = computed(() => productOfferPath(props.offer))
const promoPhase = computed(() => getPromoPhase(props.offer))
const isExpired = computed(() => isPromoExpired(props.offer))
const isUpcoming = computed(() => promoPhase.value === 'upcoming')
const endingToday = computed(() => isEndingToday(props.offer))
const hasSavings = computed(() => promoPhase.value === 'active' && Number(props.offer.diff_percent) < 0)
const subtitle = computed(() => formatOfferSubtitle(props.offer))
const priceParts = computed(() => formatOfferPriceParts(props.offer))
const unitPriceLabel = computed(() => formatUnitPrice(props.offer))
const chips = computed(() => offerChips(props.offer))
const avgLabel = computed(() => formatMoney(props.offer.avg_price))
const validityLabel = computed(() => formatPromoValidityLabel(props.offer))
const badge = computed(() => offerBadge(props.offer))
/** Badge amarelo quando o preço principal é de clube; senão a cor da fase/economia. */
const badgeClass = computed(() => badge.value
  ? (badge.value.club ? 'deal__badge--club' : `deal__badge--${badge.value.kind}`)
  : '')
const icon = computed(() => categoryIcon(props.offer.category_slug))
/** Fundo neutro com imagem; fundo suave da categoria no fallback de emoji. */
const mediaStyle = computed(() => ({ background: props.offer.image_url ? '#F7F8FA' : icon.value.bg }))
</script>
```

- [ ] **Step 3: Estilo** (substitui todo o `<style scoped>`)

```css
.deal {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  color: inherit;
  text-align: left;
  text-decoration: none;
}

.deal:hover {
  text-decoration: none;
  border-color: var(--ink-3);
}

.deal--expired {
  opacity: 0.82;
}

.deal__media {
  position: relative;
  flex: none;
  width: 92px;
  height: 92px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 12px;
}

.deal__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.deal__emoji {
  font-size: 36px;
  line-height: 1;
}

.deal__badge {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 3px 6px;
  border-radius: 8px;
  font-family: var(--head);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.deal__badge--savings { background: var(--red); color: var(--on-dark); }
.deal__badge--club { background: var(--yellow); color: var(--navy); }
.deal__badge--upcoming { background: var(--blue); color: var(--on-dark); }
.deal__badge--expired { background: #EEF0F3; color: var(--ink-2); }

.deal__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.deal__category {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.deal__name {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--ink);
}

.deal__subtitle {
  font-size: 12px;
  color: var(--ink-3);
}

.deal__price {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.deal__price-now {
  font-family: var(--head);
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.deal__price-small {
  font-family: var(--body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--ink-3);
}

.deal__was {
  font-size: 12px;
  color: var(--ink-3);
  text-decoration: line-through;
}

.deal__secondary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--ink-3);
}

.deal__store {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  font-size: 12px;
  color: var(--ink-2);
  min-width: 0;
}

.deal__store-logo {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  border-radius: 6px;
  object-fit: contain;
  background: var(--surface);
  border: 1px solid var(--line);
}

.deal__validity {
  margin: 0;
  font-size: 11px;
  color: var(--ink-3);
}

.deal__validity--hot {
  color: var(--red);
  font-weight: 600;
}

.deal__validity--expired {
  color: var(--ink-3);
}

.deal__validity--upcoming {
  color: var(--blue);
}

.deal__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 3px 0 0;
  padding: 0;
  list-style: none;
}

.deal__chip {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  background: #EEF0F3;
  color: var(--ink-2);
}

.deal__chip--promotion {
  background: var(--yellow-soft);
  color: var(--yellow-ink);
}
```

- [ ] **Step 4: Verificar** `npm test` PASS, `npm run build` OK; na home conferir um card com imagem e economia (badge vermelho), um só clube (badge amarelo), um expirado e um "Termina hoje" em vermelho; `grep -n "var(--white)" app/components/offers/OfferCard.vue` vazio.

- [ ] **Step 5: Commit**

```bash
git add app/components/offers/OfferCard.vue
git commit -m "feat(ofertas): OfferCard horizontal com imagem do recorte e badge"
git push origin develop
```

### Task 11: Fechamento da Fase 1

**Files:** nenhum novo; verificação global.

- [ ] **Step 1:** `grep -rn "var(--white)\|--navy-light\|--upcoming-light\|#151d2b\|#0a1018\|#2b3546\|#3a4454" app` → vazio. Se sobrar algo, corrigir pela tabela de regras e incluir no commit abaixo.
- [ ] **Step 2:** `grep -rn "rgba(255, 255, 255\|rgba(255,255,255" app` → só ocorrências dentro de contextos escuros (lightbox, badges sobre foto). Qualquer outra vira `var(--line)` / `var(--bg)` / `var(--ink-2)`.
- [ ] **Step 3:** `npm test` PASS e `npm run build` OK.
- [ ] **Step 4:** Commit apenas se o Step 1/2 tiver alterado arquivos: `git commit -am "fix(tema): restos da varredura do tema claro" && git push origin develop`.

---

# Parte C — Fase 2: home vitrine (`dev-joinvilleboasofertas`)

### Task 12: `ends_today` em `useOfferFilters`

**Files:**
- Modify: `app/composables/useOfferFilters.ts`
- Test: `tests/useOfferFilters.spec.ts`

**Interfaces:**
- Produces: `OfferFiltersState.ends_today: boolean`; query `ends_today=1`; `filtersToApiParams` → `ends_today: true | undefined`; `filtersActiveCount` soma 1 quando ativo.

- [ ] **Step 1: Testes falhando** — acrescentar `ends_today: false` nos dois objetos literais já existentes no spec e os casos novos:

```ts
  it('lê ends_today=1 da query e ignora outros valores', () => {
    expect(filtersFromQuery({ ends_today: '1' }).ends_today).toBe(true)
    expect(filtersFromQuery({ ends_today: 'true' }).ends_today).toBe(true)
    expect(filtersFromQuery({ ends_today: '0' }).ends_today).toBe(false)
    expect(filtersFromQuery({}).ends_today).toBe(false)
  })

  it('escreve ends_today=1 só quando ativo', () => {
    const base = { q: '', category_ids: [], establishment_ids: [], price_min: null, price_max: null, sort: 'recent' }
    expect(filtersToQuery({ ...base, ends_today: true })).toEqual({ ends_today: '1' })
    expect(filtersToQuery({ ...base, ends_today: false })).toEqual({})
  })

  it('manda ends_today para a API e conta como filtro ativo', () => {
    const base = { q: '', category_ids: [], establishment_ids: [], price_min: null, price_max: null, sort: 'recent' }
    expect(filtersToApiParams({ ...base, ends_today: true }).ends_today).toBe(true)
    expect(filtersToApiParams({ ...base, ends_today: false }).ends_today).toBeUndefined()
    expect(filtersActiveCount({ ...base, ends_today: true })).toBe(1)
  })
```

(`filtersToQuery` entra no import do spec.)

- [ ] **Step 2: Rodar** `npx vitest run tests/useOfferFilters.spec.ts` → FAIL.

- [ ] **Step 3: Implementar** em `useOfferFilters.ts`:

```ts
export type OfferFiltersState = {
  q: string
  category_ids: string[]
  establishment_ids: string[]
  price_min: number | null
  price_max: number | null
  sort: string
  /** Só ofertas cuja validade termina hoje (seção "Termina hoje" da home). */
  ends_today: boolean
}
```

`filtersFromQuery`: `ends_today: ['1', 'true'].includes(String(query.ends_today || ''))`.
`filtersToQuery`: `if (f.ends_today) out.ends_today = '1'`.
`filtersToApiParams`: `ends_today: f.ends_today ? true : undefined`.
`filtersActiveCount`: `if (f.ends_today) n += 1` (atualizar a JSDoc: "Quantidade de filtros ativos (exceto busca e sort); `ends_today` conta").

- [ ] **Step 4: Rodar** `npm test` PASS; `npm run build` OK (procurar por outros literais `OfferFiltersState` sem `ends_today` — `grep -rn "sort: 'recent'" app tests` — e completar).

- [ ] **Step 5: Commit**

```bash
git add app/composables/useOfferFilters.ts tests/useOfferFilters.spec.ts
git commit -m "feat(filtros): ends_today na URL, nos params da API e na contagem"
git push origin develop
```

### Task 13: `homeVitrine.ts`

**Files:**
- Create: `app/utils/homeVitrine.ts`
- Test: `tests/homeVitrine.spec.ts`

**Interfaces:**
- Consumes: `OfferFiltersState` (Task 12), `getPromoPhase` (promoPhase.ts), `JboOffer`.
- Produces: `isVitrineState(state): boolean`; `isRealSavings(offer, now?): boolean`; `pickHero(items, now?): JboOffer | null`; `pickTopSavings(items, heroId: string | null, limit = 8, now?): JboOffer[]`.

- [ ] **Step 1: Teste falhando** — `tests/homeVitrine.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { OfferFiltersState } from '../app/composables/useOfferFilters'
import type { JboOffer } from '../app/utils/jboApi'
import { isRealSavings, isVitrineState, pickHero, pickTopSavings } from '../app/utils/homeVitrine'

const now = new Date('2026-09-11T15:00:00.000Z')

const vitrine: OfferFiltersState = {
  q: '', category_ids: [], establishment_ids: [], price_min: null, price_max: null, sort: 'recent', ends_today: false,
}

/** Oferta mínima vigente com economia, sobrescrevível por caso. */
function offer(over: Partial<JboOffer> & { id: string }): JboOffer {
  return {
    product_id: 'p', product_name: 'Produto', product_slug: 'produto',
    establishment_id: 'e', establishment_name: 'Loja', establishment_slug: 'loja',
    recorded_at: '2026-09-10T00:00:00Z', promo_starts_on: '2026-09-08', promo_ends_on: '2026-09-14',
    price: '9.99', diff_percent: -20,
    ...over,
  }
}

describe('isVitrineState', () => {
  it('é vitrine sem filtros e sort recent', () => {
    expect(isVitrineState(vitrine)).toBe(true)
  })

  it('qualquer filtro quebra a vitrine', () => {
    expect(isVitrineState({ ...vitrine, q: 'café' })).toBe(false)
    expect(isVitrineState({ ...vitrine, category_ids: ['1'] })).toBe(false)
    expect(isVitrineState({ ...vitrine, establishment_ids: ['1'] })).toBe(false)
    expect(isVitrineState({ ...vitrine, price_min: 1 })).toBe(false)
    expect(isVitrineState({ ...vitrine, price_max: 10 })).toBe(false)
    expect(isVitrineState({ ...vitrine, ends_today: true })).toBe(false)
    expect(isVitrineState({ ...vitrine, sort: 'savings' })).toBe(false)
  })
})

describe('isRealSavings / pickHero / pickTopSavings', () => {
  it('economia real exige promo vigente e diff negativo', () => {
    expect(isRealSavings(offer({ id: 'a' }), now)).toBe(true)
    expect(isRealSavings(offer({ id: 'b', diff_percent: 0 }), now)).toBe(false)
    expect(isRealSavings(offer({ id: 'c', promo_ends_on: '2026-09-10' }), now)).toBe(false)
    expect(isRealSavings(offer({ id: 'd', promo_starts_on: '2026-09-20', promo_ends_on: '2026-09-25' }), now)).toBe(false)
  })

  it('hero é o primeiro item com economia real; null se nenhum', () => {
    const items = [offer({ id: 'x', diff_percent: 0 }), offer({ id: 'y', diff_percent: -30 }), offer({ id: 'z' })]
    expect(pickHero(items, now)?.id).toBe('y')
    expect(pickHero([offer({ id: 'x', diff_percent: 0 })], now)).toBeNull()
    expect(pickHero([], now)).toBeNull()
  })

  it('carrossel exclui o hero, ignora sem economia e expiradas e respeita o limite', () => {
    const items = [
      offer({ id: 'hero', diff_percent: -40 }),
      offer({ id: 'a', diff_percent: -30 }),
      offer({ id: 'zero', diff_percent: 0 }),
      offer({ id: 'old', diff_percent: -50, promo_ends_on: '2026-09-01' }),
      offer({ id: 'b', diff_percent: -10 }),
      offer({ id: 'c', diff_percent: -5 }),
    ]
    expect(pickTopSavings(items, 'hero', 8, now).map(o => o.id)).toEqual(['a', 'b', 'c'])
    expect(pickTopSavings(items, 'hero', 2, now).map(o => o.id)).toEqual(['a', 'b'])
    expect(pickTopSavings(items, null, 8, now).map(o => o.id)).toEqual(['hero', 'a', 'b', 'c'])
  })
})
```

- [ ] **Step 2: Rodar** `npx vitest run tests/homeVitrine.spec.ts` → FAIL.

- [ ] **Step 3: Implementar** `app/utils/homeVitrine.ts`:

```ts
/** Regras da home vitrine: quando mostrar seções e como escolher hero e carrossel. */

import type { OfferFiltersState } from '~/composables/useOfferFilters'
import type { JboOffer } from '~/utils/jboApi'
import { getPromoPhase } from '~/utils/promoPhase'

/** True quando não há busca, filtro, faixa de preço, ends_today nem ordenação diferente de recent. */
export function isVitrineState(state: OfferFiltersState): boolean {
  return !state.q
    && state.category_ids.length === 0
    && state.establishment_ids.length === 0
    && state.price_min == null
    && state.price_max == null
    && !state.ends_today
    && state.sort === 'recent'
}

/** Economia real: promo vigente e preço abaixo da média (diff_percent negativo). */
export function isRealSavings(offer: JboOffer, now = new Date()): boolean {
  return getPromoPhase(offer, now) === 'active' && Number(offer.diff_percent) < 0
}

/** Primeiro item com economia real (a API já ordena por economia); null se nenhum. */
export function pickHero(items: JboOffer[], now = new Date()): JboOffer | null {
  return items.find(item => isRealSavings(item, now)) ?? null
}

/** Itens com economia real para o carrossel, sem o hero, até `limit`. */
export function pickTopSavings(
  items: JboOffer[],
  heroId: string | null,
  limit = 8,
  now = new Date(),
): JboOffer[] {
  return items
    .filter(item => item.id !== heroId && isRealSavings(item, now))
    .slice(0, limit)
}
```

- [ ] **Step 4: Rodar** `npm test` PASS.

- [ ] **Step 5: Commit**

```bash
git add app/utils/homeVitrine.ts tests/homeVitrine.spec.ts
git commit -m "feat(home): regras de vitrine, hero e maiores descontos"
git push origin develop
```

### Task 14: `JboFacets.slug`, `HomeSection.vue` e `CategoryGrid.vue`

**Files:**
- Modify: `app/utils/jboApi.ts` (`JboFacets`)
- Create: `app/components/home/HomeSection.vue`, `app/components/home/CategoryGrid.vue`

**Interfaces:**
- Consumes: `categoryIcon`, `orderCategories` (Task 6).
- Produces: `JboFacets = { categories: { id, name, slug?: string | null }[], establishments: { id, name, slug?: string | null }[] }`; `<HomeSection title?: string bleed?: boolean>` com slot default e slot `aside`; `<CategoryGrid :categories :expanded :limit>`.

- [ ] **Step 1: `jboApi.ts`**

```ts
export type JboFacetItem = { id: string, name: string, slug?: string | null }

export type JboFacets = {
  categories: JboFacetItem[]
  establishments: JboFacetItem[]
}
```

- [ ] **Step 2: `app/components/home/HomeSection.vue`**

```vue
<template>
  <section class="hsec" :class="{ 'hsec--bleed': bleed }" :aria-label="title || undefined">
    <div v-if="title || $slots.aside" class="hsec__head">
      <h2 v-if="title" class="hsec__title">{{ title }}</h2>
      <div v-if="$slots.aside" class="hsec__aside">
        <slot name="aside" />
      </div>
    </div>
    <slot />
  </section>
</template>

<script setup lang="ts">
/** Seção da home: título Montserrat à esquerda, ação/pill à direita, conteúdo abaixo. */
withDefaults(defineProps<{
  title?: string
  /** Sem padding lateral (carrossel que sangra até a borda). */
  bleed?: boolean
}>(), {
  title: '',
  bleed: false,
})
</script>

<style scoped>
.hsec {
  max-width: 720px;
  margin: 0 auto;
  padding: 22px 16px 0;
}

.hsec--bleed {
  padding-left: 0;
  padding-right: 0;
}

.hsec--bleed .hsec__head {
  padding: 0 16px;
}

.hsec__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.hsec__title {
  margin: 0;
  font-family: var(--head);
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--ink);
}

.hsec__aside {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
}

.hsec__aside :deep(a),
.hsec__aside :deep(button) {
  font: inherit;
  color: var(--ink-2);
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  text-decoration: none;
}

.hsec__aside :deep(a:hover),
.hsec__aside :deep(button:hover) {
  text-decoration: underline;
}
</style>
```

- [ ] **Step 3: `app/components/home/CategoryGrid.vue`**

```vue
<template>
  <div class="cats">
    <NuxtLink
      v-for="c in visible"
      :key="c.slug"
      class="cat"
      :to="`/categoria/${c.slug}`"
    >
      <span class="cat__icon" :style="{ background: categoryIcon(c.slug).bg }" aria-hidden="true">
        {{ categoryIcon(c.slug).emoji }}
      </span>
      <span class="cat__name">{{ c.name }}</span>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { categoryIcon, orderCategories } from '~/utils/categoryIcons'
import type { JboFacetItem } from '~/utils/jboApi'

type CategoryWithSlug = { id: string, name: string, slug: string }

const props = withDefaults(defineProps<{
  categories: JboFacetItem[]
  /** Mostra todas em vez das primeiras `limit`. */
  expanded?: boolean
  limit?: number
}>(), {
  expanded: false,
  limit: 8,
})

/** Só categorias com slug (sem slug não há página para linkar), na ordem do protótipo. */
const ordered = computed<CategoryWithSlug[]>(() =>
  orderCategories(
    props.categories
      .filter(c => Boolean(c.slug))
      .map(c => ({ id: c.id, name: c.name, slug: String(c.slug) })),
  ),
)

const visible = computed(() => props.expanded ? ordered.value : ordered.value.slice(0, props.limit))
</script>

<style scoped>
.cats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.cat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 6px 10px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  color: var(--ink-2);
  font-size: 11.5px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
}

.cat:hover {
  border-color: var(--ink-3);
  text-decoration: none;
}

.cat__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  font-size: 20px;
}

.cat__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
</style>
```

- [ ] **Step 4: Verificar** `npm run build` OK e `npm test` PASS (componentes ainda não usados; a home entra na Tarefa 17).

- [ ] **Step 5: Commit**

```bash
git add app/utils/jboApi.ts app/components/home/HomeSection.vue app/components/home/CategoryGrid.vue
git commit -m "feat(home): HomeSection, CategoryGrid e slug nas facetas"
git push origin develop
```

### Task 15: `OfferTile.vue` e `OfferCarousel.vue`

**Files:**
- Create: `app/components/offers/OfferTile.vue`, `app/components/home/OfferCarousel.vue`

**Interfaces:**
- Consumes: `offerBadge` (Task 5), `categoryIcon` (Task 6), `isEndingToday`, `getPromoPhase`, `isPromoExpired`, `formatPromoValidityLabel` (promoPhase.ts), `formatPromoEndLabel` (relativeTime.ts), `formatOfferPriceParts`, `formatUnitPrice`, `formatMoney`, `offerChips` (offerPrice.ts), `productOfferPath`.
- Produces: `<OfferTile :offer>` (156px, vertical); `<OfferCarousel :offers>`.

- [ ] **Step 1: `app/components/offers/OfferTile.vue`**

```vue
<template>
  <NuxtLink class="tile" :class="{ 'tile--expired': isExpired }" :to="productHref">
    <div class="tile__media" :style="mediaStyle">
      <img
        v-if="offer.image_url"
        class="tile__img"
        :src="offer.image_url"
        :alt="offer.product_name"
        loading="lazy"
      >
      <span v-else class="tile__emoji" aria-hidden="true">{{ icon.emoji }}</span>
      <span v-if="badge" class="tile__badge" :class="badgeClass">{{ badge.label }}</span>
    </div>
    <div class="tile__body">
      <div class="tile__name">{{ offer.product_name }}</div>
      <div class="tile__price">
        <span class="tile__price-now">
          <span v-if="priceParts.prefix" class="tile__price-small">{{ priceParts.prefix }} </span>{{ priceParts.amount }}<span
            v-if="priceParts.suffix"
            class="tile__price-small"
          >{{ priceParts.suffix }}</span>
        </span>
        <s v-if="strike" class="tile__was">{{ strike }}</s>
      </div>
      <div v-if="secondary" class="tile__secondary">{{ secondary }}</div>
      <div class="tile__store">
        <img
          v-if="offer.establishment_logo_url"
          class="tile__store-logo"
          :src="offer.establishment_logo_url"
          :alt="`Logo ${offer.establishment_name}`"
          loading="lazy"
        >
        <span class="tile__store-name">{{ offer.establishment_name }}</span>
      </div>
      <div v-if="validityLabel" class="tile__valid" :class="{ 'tile__valid--hot': endingToday }">
        {{ validityLabel }}
      </div>
      <span v-if="promotion" class="tile__chip">{{ promotion }}</span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { categoryIcon } from '~/utils/categoryIcons'
import { productOfferPath, type JboOffer } from '~/utils/jboApi'
import { offerBadge } from '~/utils/offerBadge'
import { formatMoney, formatOfferPriceParts, formatUnitPrice, offerChips } from '~/utils/offerPrice'
import { formatPromoValidityLabel, getPromoPhase, isEndingToday, isPromoExpired } from '~/utils/promoPhase'
import { formatPromoEndLabel } from '~/utils/relativeTime'

const props = defineProps<{ offer: JboOffer }>()

const productHref = computed(() => productOfferPath(props.offer))
const phase = computed(() => getPromoPhase(props.offer))
const isExpired = computed(() => isPromoExpired(props.offer))
const endingToday = computed(() => isEndingToday(props.offer))
const hasSavings = computed(() => phase.value === 'active' && Number(props.offer.diff_percent) < 0)
const priceParts = computed(() => formatOfferPriceParts(props.offer))
const badge = computed(() => offerBadge(props.offer))
const badgeClass = computed(() => badge.value
  ? (badge.value.club ? 'tile__badge--club' : `tile__badge--${badge.value.kind}`)
  : '')
const icon = computed(() => categoryIcon(props.offer.category_slug))
const mediaStyle = computed(() => ({ background: props.offer.image_url ? '#F7F8FA' : icon.value.bg }))

/** Riscado: regular quando há clube; senão a média quando há economia. */
const strike = computed(() => priceParts.value.regular
  || (hasSavings.value ? formatMoney(props.offer.avg_price) : ''))

/** Linha secundária: "R$ 5,00 cada" no lote, senão preço por base de comparação. */
const secondary = computed(() => priceParts.value.each || formatUnitPrice(props.offer) || '')

/** "Termina hoje" em destaque; vigente "Até {rótulo curto}"; demais fases usam o texto completo. */
const validityLabel = computed(() => {
  if (!props.offer.promo_ends_on) return ''
  if (endingToday.value) return 'Termina hoje'
  if (phase.value === 'active') return `Até ${formatPromoEndLabel(props.offer.promo_ends_on)}`
  return formatPromoValidityLabel(props.offer)
})

const promotion = computed(() => offerChips(props.offer).find(chip => chip.key === 'promotion')?.label || '')
</script>

<style scoped>
.tile {
  display: flex;
  flex-direction: column;
  width: 156px;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  color: inherit;
  text-decoration: none;
  transition: transform 0.1s;
}

.tile:hover {
  text-decoration: none;
  border-color: var(--ink-3);
}

.tile:active {
  transform: scale(0.98);
}

.tile--expired {
  opacity: 0.82;
}

.tile__media {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 1 / 1;
  width: 100%;
  overflow: hidden;
}

.tile__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.tile__emoji {
  font-size: 44px;
  line-height: 1;
}

.tile__badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 7px;
  border-radius: 8px;
  font-family: var(--head);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.tile__badge--savings { background: var(--red); color: var(--on-dark); }
.tile__badge--club { background: var(--yellow); color: var(--navy); }
.tile__badge--upcoming { background: var(--blue); color: var(--on-dark); }
.tile__badge--expired { background: #EEF0F3; color: var(--ink-2); }

.tile__body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px 12px;
}

.tile__name {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--ink);
}

.tile__price {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.tile__price-now {
  font-family: var(--head);
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.tile__price-small {
  font-family: var(--body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--ink-3);
}

.tile__was {
  font-size: 12px;
  color: var(--ink-3);
  text-decoration: line-through;
}

.tile__secondary {
  font-size: 12px;
  color: var(--ink-3);
}

.tile__store {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--ink-2);
  min-width: 0;
}

.tile__store-logo {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  border-radius: 6px;
  object-fit: contain;
  background: var(--surface);
  border: 1px solid var(--line);
}

.tile__store-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tile__valid {
  font-size: 11px;
  color: var(--ink-3);
}

.tile__valid--hot {
  color: var(--red);
  font-weight: 600;
}

.tile__chip {
  align-self: flex-start;
  margin-top: 2px;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--yellow-soft);
  color: var(--yellow-ink);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
}
</style>
```

- [ ] **Step 2: `app/components/home/OfferCarousel.vue`**

```vue
<template>
  <div class="hlist" role="list">
    <div
      v-for="offer in offers"
      :key="offer.id"
      class="hlist__item"
      role="listitem"
    >
      <OfferTile :offer="offer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { JboOffer } from '~/utils/jboApi'

/** Lista horizontal com scroll-snap (estilo .hlist do protótipo). */
defineProps<{ offers: JboOffer[] }>()
</script>

<style scoped>
.hlist {
  display: flex;
  gap: 12px;
  padding: 0 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.hlist::-webkit-scrollbar {
  display: none;
}

.hlist__item {
  flex: none;
  scroll-snap-align: start;
}
</style>
```

- [ ] **Step 3: Verificar** `npm run build` OK; `npm test` PASS.

- [ ] **Step 4: Commit**

```bash
git add app/components/offers/OfferTile.vue app/components/home/OfferCarousel.vue
git commit -m "feat(home): OfferTile vertical e carrossel com scroll-snap"
git push origin develop
```

### Task 16: `HeroSavings.vue`

**Files:**
- Create: `app/components/home/HeroSavings.vue`

**Interfaces:**
- Consumes: `savingsPercent` (Task 5), `isEndingToday` (Task 4), `formatPromoEndLabel` (relativeTime.ts), `formatOfferPriceParts`, `productOfferPath`.
- Produces: `<HeroSavings :offer>` — o card inteiro é link para o produto.

- [ ] **Step 1: Implementar**

```vue
<template>
  <NuxtLink class="hero" :to="productHref" data-test="home-hero">
    <div class="hero__text">
      <div class="hero__eyebrow">Maior economia da semana</div>
      <h2 class="hero__title">
        <span class="hero__name">{{ offer.product_name }}</span>
        <span class="hero__price">
          <span v-if="priceParts.prefix" class="hero__price-small">{{ priceParts.prefix }} </span>{{ priceParts.amount }}<span
            v-if="priceParts.suffix"
            class="hero__price-small"
          >{{ priceParts.suffix }}</span>
        </span>
      </h2>
      <p class="hero__meta">{{ meta }}</p>
      <span class="hero__cta">Ver oferta →</span>
    </div>
    <img
      v-if="offer.image_url"
      class="hero__img"
      :src="offer.image_url"
      :alt="offer.product_name"
      loading="lazy"
    >
  </NuxtLink>
</template>

<script setup lang="ts">
import { productOfferPath, type JboOffer } from '~/utils/jboApi'
import { savingsPercent } from '~/utils/offerBadge'
import { formatOfferPriceParts } from '~/utils/offerPrice'
import { isEndingToday } from '~/utils/promoPhase'
import { formatPromoEndLabel } from '~/utils/relativeTime'

const props = defineProps<{ offer: JboOffer }>()

const productHref = computed(() => productOfferPath(props.offer))
const priceParts = computed(() => formatOfferPriceParts(props.offer))

/** "{pct}% abaixo da média · {loja} · termina hoje | até {rótulo}". */
const meta = computed(() => {
  const parts = [`${savingsPercent(props.offer)}% abaixo da média`, props.offer.establishment_name]
  if (props.offer.promo_ends_on) {
    parts.push(isEndingToday(props.offer) ? 'termina hoje' : `até ${formatPromoEndLabel(props.offer.promo_ends_on)}`)
  }
  return parts.join(' · ')
})
</script>

<style scoped>
.hero {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  overflow: hidden;
  padding: 18px 18px 16px;
  border-radius: 20px;
  background: var(--navy);
  color: var(--on-dark);
  text-decoration: none;
}

.hero::before {
  content: "";
  position: absolute;
  right: -40px;
  top: -40px;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 200, 0, 0.35), transparent 70%);
  pointer-events: none;
}

.hero:hover {
  text-decoration: none;
}

.hero__text {
  position: relative;
  flex: 1;
  min-width: 0;
}

.hero__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--yellow);
}

.hero__title {
  display: flex;
  flex-direction: column;
  margin: 6px 0 4px;
  font-family: var(--head);
  font-size: 24px;
  font-weight: 900;
  line-height: 1.1;
  color: var(--on-dark);
}

.hero__price-small {
  font-family: var(--body);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0;
  color: rgba(255, 255, 255, 0.7);
}

.hero__meta {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.hero__cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--yellow);
  color: var(--navy);
  font-size: 13px;
  font-weight: 800;
}

.hero__img {
  position: relative;
  flex: none;
  width: 72px;
  height: 72px;
  border-radius: 12px;
  object-fit: contain;
  background: #F7F8FA;
}
</style>
```

- [ ] **Step 2: Verificar** `npm run build` OK.

- [ ] **Step 3: Commit**

```bash
git add app/components/home/HeroSavings.vue
git commit -m "feat(home): hero Maior economia da semana"
git push origin develop
```

### Task 17: `index.vue` — vitrine × lista e remoção dos Stories

**Files:**
- Modify: `app/pages/index.vue` (reescrever)
- Delete: `app/components/offers/StoryShortcuts.vue`, `app/utils/storyShortcuts.ts`, `tests/storyShortcuts.spec.ts`, `public/shortcuts/` (pasta inteira)

**Interfaces:**
- Consumes: `isVitrineState`, `pickHero`, `pickTopSavings` (Task 13); `HomeSection`, `CategoryGrid` (Task 14); `OfferCarousel` (Task 15); `HeroSavings` (Task 16); `OfferCard` (Task 10); `useOfferFilters` com `ends_today` (Task 12); API `ends_today` (Task 1).
- Produces: home com as seções; `?ends_today=1` mostra a lista "Termina hoje" com botão Limpar.

- [ ] **Step 1: Remover os Stories**

```bash
git rm -q app/components/offers/StoryShortcuts.vue app/utils/storyShortcuts.ts tests/storyShortcuts.spec.ts
git rm -rq public/shortcuts
grep -rn "storyShortcuts\|StoryShortcuts\|/shortcuts/" app tests docs README.md nuxt.config.ts
```

O grep só pode apontar `app/pages/index.vue` (reescrito no Step 2) e `docs/ESTRUTURA-ATUAL.md` (ajustado na Tarefa 19).

- [ ] **Step 2: Template de `app/pages/index.vue`**

```vue
<template>
  <div class="home">
    <AppHeader>
      <SearchBar v-model="qDraft" @submit="onSearch" />
    </AppHeader>

    <FilterBar
      :facets="facets"
      :category-ids="filters.state.value.category_ids"
      :establishment-ids="filters.state.value.establishment_ids"
      :sort="filters.state.value.sort"
      @update:sort="onSort"
      @apply-categories="onApplyCategories"
      @apply-establishments="onApplyEstablishments"
    />

    <template v-if="isVitrine">
      <div v-if="hero" class="home__hero">
        <HeroSavings :offer="hero" />
      </div>

      <HomeSection v-if="categoriesWithSlug.length" title="Categorias">
        <template v-if="canExpandCategories" #aside>
          <button type="button" data-test="home-cats-toggle" @click="catsExpanded = !catsExpanded">
            {{ catsExpanded ? 'Ver menos' : 'Ver todas' }}
          </button>
        </template>
        <CategoryGrid :categories="facets.categories" :expanded="catsExpanded" />
      </HomeSection>

      <HomeSection v-if="topSavings.length" title="Maiores descontos" bleed>
        <template #aside>
          <NuxtLink to="/?sort=savings">Ver todos</NuxtLink>
        </template>
        <OfferCarousel :offers="topSavings" />
      </HomeSection>

      <HomeSection v-if="endingCount > 0 && endingItems.length" title="Termina hoje">
        <template #aside>
          <span class="home__pill">⏱ {{ endingCount }} {{ endingCount === 1 ? 'oferta' : 'ofertas' }}</span>
        </template>
        <div class="home__list">
          <OfferCard v-for="offer in endingItems" :key="offer.id" :offer="offer" />
        </div>
        <NuxtLink v-if="endingCount > endingItems.length" class="home__more" to="/?ends_today=1">
          Ver todas as {{ endingCount }} ofertas
        </NuxtLink>
      </HomeSection>
    </template>

    <div v-else-if="filters.state.value.ends_today" class="home__heading">
      <h1>Termina hoje</h1>
      <button type="button" class="home__clear" @click="filters.clear()">Limpar</button>
    </div>

    <HomeSection :title="isVitrine ? 'Novas ofertas' : ''">
      <section class="home__deals" aria-label="Ofertas em Joinville">
        <OfferCard
          v-for="offer in items"
          :key="offer.id"
          :offer="offer"
        />

        <div v-if="hasMore" ref="sentinelRef" class="home__sentinel" />

        <div v-if="loadingMore" class="home__loading home__loading--more" aria-live="polite">
          Carregando mais produtos
        </div>

        <div v-if="pending" class="home__loading" aria-live="polite">
          Carregando ofertas…
        </div>

        <div v-if="!pending && !loadError && items.length === 0" class="home__empty">
          <p v-if="filters.state.value.q">
            Nenhuma oferta para “{{ filters.state.value.q }}”.
          </p>
          <p v-else-if="activeCount > 0">Nenhuma oferta com esses filtros.</p>
          <p v-else>Nenhuma oferta disponível no momento.</p>
          <button
            v-if="filters.state.value.q || activeCount > 0"
            type="button"
            @click="filters.clear()"
          >
            Limpar filtros
          </button>
        </div>

        <div v-if="loadError" class="home__error">
          <p>Não foi possível carregar as ofertas.</p>
          <button type="button" @click="refresh">Tentar de novo</button>
        </div>
      </section>
    </HomeSection>
  </div>
</template>
```

- [ ] **Step 3: Script** — substituir o `<script setup>` inteiro:

```ts
<script setup lang="ts">
import { jboGet, type JboFacets, type JboOffer, type JboOffersPage } from '~/utils/jboApi'
import { isVitrineState, pickHero, pickTopSavings } from '~/utils/homeVitrine'

type CountResponse = { count: number }

const filters = useOfferFilters()
const sentinelRef = ref<HTMLElement | null>(null)
const qDraft = ref(filters.state.value.q)
const activeCount = filters.activeCount
const config = useRuntimeConfig()

const extraItems = ref<JboOffer[]>([])
const nextCursor = ref<string | null>(null)
const loadingMore = ref(false)
const catsExpanded = ref(false)

/** Instante único para SSR e hidratação decidirem fase/hero com o mesmo "agora". */
const renderedAt = useState('home:rendered-at', () => new Date().toISOString())
const now = computed(() => new Date(renderedAt.value))

const isVitrine = computed(() => isVitrineState(filters.state.value))

useJboSeo({
  title: 'Ofertas em Joinville | Joinville Boas Ofertas',
  description: 'Compare preços vigentes nos supermercados de Joinville e região.',
  path: '/',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Joinville Boas Ofertas',
    url: config.public.siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${config.public.siteUrl}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  },
})

const [facetsResult, offersResult, savingsResult, endingResult, endingCountResult] = await Promise.all([
  useAsyncData(
    'jbo-facets',
    () => jboGet<JboFacets>('/offers/facets').catch(() => ({
      categories: [],
      establishments: [],
    })),
  ),
  useAsyncData(
    'jbo-offers',
    () => jboGet<JboOffersPage>('/offers', {
      ...filters.apiParams.value,
      page_size: 20,
    }),
    { watch: [() => JSON.stringify(filters.apiParams.value)] },
  ),
  useAsyncData(
    'jbo-home-savings',
    () => isVitrine.value
      ? jboGet<JboOffersPage>('/offers', { sort: 'savings', page_size: 10 }).catch(() => null)
      : Promise.resolve(null),
    { watch: [isVitrine] },
  ),
  useAsyncData(
    'jbo-home-ending',
    () => isVitrine.value
      ? jboGet<JboOffersPage>('/offers', { ends_today: true, sort: 'recent', page_size: 6 }).catch(() => null)
      : Promise.resolve(null),
    { watch: [isVitrine] },
  ),
  useAsyncData(
    'jbo-home-ending-count',
    () => isVitrine.value
      ? jboGet<CountResponse>('/offers/count', { ends_today: true }).catch(() => null)
      : Promise.resolve(null),
    { watch: [isVitrine] },
  ),
])

const facetsData = facetsResult.data
const facets = computed<JboFacets>(() => facetsData.value || {
  categories: [],
  establishments: [],
})

const {
  data: pageData,
  pending,
  error: pageError,
  refresh,
} = offersResult

useSyncLoadingIndicator(pending)

const items = computed(() => [
  ...(pageData.value?.items || []),
  ...extraItems.value,
])
const hasMore = computed(() => Boolean(nextCursor.value))
const loadError = computed(() => Boolean(pageError.value))

/** Seções da vitrine (nulas fora dela ou quando a chamada falhou). */
const savingsItems = computed<JboOffer[]>(() => savingsResult.data.value?.items || [])
const hero = computed(() => pickHero(savingsItems.value, now.value))
const topSavings = computed(() => pickTopSavings(savingsItems.value, hero.value?.id ?? null, 8, now.value))
const endingItems = computed<JboOffer[]>(() => endingResult.data.value?.items || [])
const endingCount = computed(() => endingCountResult.data.value?.count ?? 0)
const categoriesWithSlug = computed(() => facets.value.categories.filter(c => Boolean(c.slug)))
const canExpandCategories = computed(() => categoriesWithSlug.value.length > 8)

watch(pageData, (page) => {
  extraItems.value = []
  nextCursor.value = page?.next_cursor ?? null
}, { immediate: true })

watch(
  () => filters.state.value.q,
  (q) => { qDraft.value = q },
)

/**
 * Aplica busca na URL.
 */
async function onSearch() {
  await filters.patch({ q: qDraft.value.trim() })
}

/**
 * Atualiza ordenação.
 */
async function onSort(sort: string) {
  await filters.patch({ sort })
}

/**
 * Aplica categorias escolhidas no chip da filterbar.
 */
async function onApplyCategories(ids: string[]) {
  await filters.patch({ category_ids: ids })
}

/**
 * Aplica lojas escolhidas no chip da filterbar.
 */
async function onApplyEstablishments(ids: string[]) {
  await filters.patch({ establishment_ids: ids })
}

/**
 * Carrega a próxima página do cursor.
 */
async function loadMore() {
  if (!nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const page = await jboGet<JboOffersPage>('/offers', {
      ...filters.apiParams.value,
      cursor: nextCursor.value,
      page_size: 20,
    })
    extraItems.value = [...extraItems.value, ...(page.items || [])]
    nextCursor.value = page.next_cursor
  }
  finally {
    loadingMore.value = false
  }
}

onMounted(() => {
  const io = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) loadMore()
  }, { rootMargin: '200px' })

  watch(sentinelRef, (el, _, onCleanup) => {
    if (!el) return
    io.observe(el)
    onCleanup(() => io.unobserve(el))
  }, { immediate: true })
})
</script>
```

- [ ] **Step 4: Estilo** — substituir o `<style scoped>`:

```css
.home__hero {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px 16px 0;
}

.home__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.home__pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--red-soft);
  color: var(--red);
  font-size: 11px;
  font-weight: 700;
}

.home__more {
  display: block;
  margin-top: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--blue);
  text-align: center;
}

.home__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  max-width: 720px;
  margin: 0 auto;
  padding: 22px 16px 0;
}

.home__heading h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.home__clear {
  height: 34px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink-2);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.home__deals {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.home__sentinel {
  height: 1px;
}

.home__loading,
.home__empty,
.home__error {
  text-align: center;
  color: var(--ink-3);
  padding: 1.5rem 0.5rem;
}

.home__empty button,
.home__error button {
  margin-top: 0.75rem;
  border: none;
  background: var(--yellow);
  color: var(--navy);
  font-weight: 800;
  border-radius: 10px;
  padding: 0.6rem 1rem;
  cursor: pointer;
}
```

- [ ] **Step 5: Verificar** — `npm test` PASS (o spec dos Stories foi removido); `npm run build` OK; com o snap-api dev no ar, abrir `/` (hero + 4 seções), `/?q=arroz` (só lista), `/?ends_today=1` (título "Termina hoje" + Limpar), `/?sort=savings` (só lista). Sem economia real no dev, o hero e o carrossel somem sem erro.

- [ ] **Step 6: Commit**

```bash
git add -A app/pages/index.vue app/components/offers app/utils tests public
git commit -m "feat(home): vitrine com hero, categorias, maiores descontos e termina hoje; remove Stories"
git push origin develop
```

### Task 18: Página de categoria — ícone e scroll infinito

**Files:**
- Modify: `app/pages/categoria/[slug].vue`

**Interfaces:**
- Consumes: `categoryIcon` (Task 6), `OfferCard`, API `GET /categories/{slug}?cursor&page_size=20` (já existe).

- [ ] **Step 1: Template**

```vue
<template>
  <div class="page">
    <AppHeader />
    <main v-if="data" class="page__main">
      <div class="page__heading">
        <span class="page__icon" :style="{ background: icon.bg }" aria-hidden="true">{{ icon.emoji }}</span>
        <h1>{{ data.category.name }}</h1>
      </div>
      <OfferCard
        v-for="offer in items"
        :key="offer.id"
        :offer="offer"
      />
      <div v-if="hasMore" ref="sentinelRef" class="page__sentinel" />
      <p v-if="loadingMore" class="page__loading" aria-live="polite">Carregando mais…</p>
      <p v-if="!items.length" class="empty">
        Sem ofertas vigentes nesta categoria.
      </p>
    </main>
  </div>
</template>
```

- [ ] **Step 2: Script** — acrescentar ao `<script setup>` existente (manter `useAsyncData`, 404 e `useJboSeo`):

```ts
import { categoryIcon } from '~/utils/categoryIcons'
import { jboGet, type JboOffer } from '~/utils/jboApi'

const icon = computed(() => categoryIcon(slug.value))

const sentinelRef = ref<HTMLElement | null>(null)
const extraItems = ref<JboOffer[]>([])
const nextCursor = ref<string | null>(null)
const loadingMore = ref(false)

const items = computed(() => [...(data.value?.items || []), ...extraItems.value])
const hasMore = computed(() => Boolean(nextCursor.value))

watch(data, (page) => {
  extraItems.value = []
  nextCursor.value = page?.next_cursor ?? null
}, { immediate: true })

/**
 * Carrega a próxima página do cursor; erro é silencioso (mantém o que já carregou).
 */
async function loadMore() {
  if (!nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const page = await jboGet<CatPage>(`/categories/${slug.value}`, {
      cursor: nextCursor.value,
      page_size: 20,
    })
    extraItems.value = [...extraItems.value, ...(page.items || [])]
    nextCursor.value = page.next_cursor
  }
  catch {
    nextCursor.value = null
  }
  finally {
    loadingMore.value = false
  }
}

onMounted(() => {
  const io = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) loadMore()
  }, { rootMargin: '200px' })

  watch(sentinelRef, (el, _, onCleanup) => {
    if (!el) return
    io.observe(el)
    onCleanup(() => io.unobserve(el))
  }, { immediate: true })
})
```

- [ ] **Step 3: Estilo** — acrescentar/ajustar:

```css
.page__heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 0.5rem;
}

.page__icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  font-size: 26px;
}

h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.page__sentinel {
  height: 1px;
}

.page__loading,
.empty {
  text-align: center;
  color: var(--ink-3);
}
```

- [ ] **Step 4: Verificar** `npm run build` OK; abrir `/categoria/mercearia` e rolar até carregar a segunda página (a categoria precisa ter > 20 ofertas no dev; senão conferir que a sentinela não aparece).

- [ ] **Step 5: Commit**

```bash
git add app/pages/categoria
git commit -m "feat(categoria): ícone da categoria e scroll infinito"
git push origin develop
```

### Task 19: Documentação e capturas de tela

**Files:**
- Create: `scripts/screens.cjs`
- Modify: `README.md`, `docs/ESTRUTURA-ATUAL.md`, `docs/screens/*.png`, `package.json` (script `screens`)

- [ ] **Step 1: `scripts/screens.cjs`** — usa o Playwright do cache do npx e o Chromium 1228 (memória do host: `npx playwright` não funciona aqui):

```js
/* Captura as telas do JBO em 390×844 (full page) para docs/screens/.
 * Uso: npm run build && NITRO_PORT=3111 node .output/server/index.mjs &
 *      CHROME=/root/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome \
 *      NODE_PATH=/root/.npm/_npx/e41f203b7505f1fb/node_modules \
 *      BASE=http://127.0.0.1:3111 node scripts/screens.cjs
 * Sem proxy /api local, aponte BASE para o compose (http://localhost:8092). */
const path = require('node:path')
const { chromium } = require('playwright')

const BASE = process.env.BASE || 'http://localhost:8092'
const OUT = path.join(__dirname, '..', 'docs', 'screens')

/** Telas: arquivo, rota e ação opcional antes da captura. */
const SHOTS = [
  ['01-home.png', '/'],
  ['02-lojas.png', '/lojas'],
  ['03-loja.png', process.env.LOJA_PATH || '/lojas'],
  ['04-categoria.png', '/categoria/mercearia'],
  ['05-produto.png', process.env.PRODUTO_PATH || '/'],
  ['06-encartes.png', '/encartes'],
  ['07-encarte.png', process.env.ENCARTE_PATH || '/encartes'],
  ['08-envie-encarte.png', '/envie-um-encarte'],
  ['09-faq.png', '/perguntas-frequentes'],
  ['10-privacidade.png', '/privacidade'],
  ['11-termos.png', '/termos'],
  ['12-menu.png', '/', async page => page.click('.hmenu__trigger')],
  ['13-filtro-categorias.png', '/', async page => page.click('.chipdd__trigger >> nth=0')],
  ['14-encarte-lightbox.png', process.env.ENCARTE_PATH || '/encartes', async page => page.click('[data-test="encarte-open"]')],
  ['15-follow-modal.png', '/lojas', async page => page.click('.store-bell__btn >> nth=0')],
  ['16-home-filtro.png', '/?q=arroz'],
  ['17-home-termina-hoje.png', '/?ends_today=1'],
]

/** Abre cada rota, executa a ação e salva a captura full-page. */
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  for (const [file, route, action] of SHOTS) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
    if (action) {
      await action(page)
      await page.waitForTimeout(400)
    }
    await page.screenshot({ path: path.join(OUT, file), fullPage: true })
    console.log('ok', file)
  }
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

Em `package.json`: `"screens": "node scripts/screens.cjs"`. Definir `LOJA_PATH`, `PRODUTO_PATH` e `ENCARTE_PATH` com rotas reais do dev (ex.: `/loja/giassi`, `/produto/arroz-tio-joao-5kg/giassi`, `/encarte/<uuid>`) ao rodar.

- [ ] **Step 2: Rodar as capturas** — `docker compose up -d` neste repo (porta 8092, com `/api` proxied) e:

```bash
CHROME=/root/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome \
NODE_PATH=/root/.npm/_npx/e41f203b7505f1fb/node_modules \
BASE=http://localhost:8092 LOJA_PATH=/loja/<slug> PRODUTO_PATH=/produto/<slug>/<loja> ENCARTE_PATH=/encarte/<id> \
npm run screens
```

Conferir a olho `01-home.png` (hero, categorias, carrossel, termina hoje, novas ofertas), `16` e `17`.

- [ ] **Step 3: `README.md`** — na tabela de rotas, `/` passa a "Home vitrine: hero da maior economia, categorias, maiores descontos, termina hoje e novas ofertas; qualquer filtro/busca vira lista (`?ends_today=1` lista só o que vence hoje)". Nova seção após "Ofertas (contrato do snap-api)":

```markdown
## Tema e tipografia

Tokens em `app/assets/css/tokens.css` (tema claro): `--bg #F3F4F6`, `--surface #FFFFFF`,
`--line #E6E8EC`, texto `--ink/--ink-2/--ink-3`, marca `--navy`, destaque `--yellow` /
`--yellow-soft` / `--yellow-ink`, alerta `--red` / `--red-soft`, informação `--blue` / `--blue-soft`.
Inter no corpo (`--body`), Montserrat em títulos, marca e preços (`--head`).
`--white` e `--navy-light` não existem mais — texto sobre fundo escuro usa `--on-dark`.

Capturas: `npm run screens` (ver cabeçalho de `scripts/screens.cjs`).
```

Na seção "Spec / plano" acrescentar `docs/superpowers/specs/2026-09-11-jbo-home-vitrine-tema-claro-design.md` e `docs/superpowers/plans/2026-09-11-jbo-home-vitrine-tema-claro.md`.

- [ ] **Step 4: `docs/ESTRUTURA-ATUAL.md`** — atualizar: tabela de screenshots (adicionar 16 e 17); seção "1. `/` — Home de ofertas": estrutura nova (Header+busca → FilterBar → [vitrine: Hero, Categorias, Maiores descontos, Termina hoje] → Novas ofertas/feed), componentes (`HeroSavings`, `CategoryGrid`, `OfferCarousel`, `OfferTile`, `HomeSection`), dados (`/offers?sort=savings&page_size=10`, `/offers?ends_today=true&page_size=6`, `/offers/count?ends_today=true`), filtros na URL com `ends_today`; remover "Faixa Stories" e a seção "Atalhos Stories (home) — estáticos"; seção "4. `/categoria/[slug]`": ícone e scroll infinito; seção "Tokens de design": colar o `:root` novo e as notas de fonte/PWA (`#F3F4F6`); "Card (`JboOffer`)": imagem 92×92 + badge (economia / clube / em breve / expirado), "Termina hoje" em vermelho; "Enum de status": UI de cada fase com as cores novas (`--red-soft/--red` para termina hoje). Tipos `JboOffer`: substituir `is_club_price`, `price_volume_min`, `volume_*`, `pricing_mode` por `club_price`, `pricing`, `quantity_label`, `unit_price`, `unit_price_base`, `encarte_bbox` (o doc estava defasado).

- [ ] **Step 5: Verificar** `grep -rn "storyShortcuts\|StoryShortcuts\|/shortcuts/" app tests docs README.md` vazio; `npm test` PASS; `npm run build` OK.

- [ ] **Step 6: Commit**

```bash
git add scripts/screens.cjs package.json README.md docs/ESTRUTURA-ATUAL.md docs/screens
git commit -m "docs: home vitrine, tema claro e script de capturas de tela"
git push origin develop
```

---

## Self-review

- **Cobertura da spec:** Fase 1 tokens/fontes/PWA → Task 3; regras de mapeamento e componentes específicos (AppHeader, HeaderMenu, Search, FilterBar/ChipDropdown, sheets/modais, StoreFollowBell, Encarte*, ProductStoreBox/produto, páginas de texto) → Tasks 7–9 + 11; `OfferCard` redesenhado, `offerBadge`, "Termina hoje"/`isEndingToday` → Tasks 4, 5, 10; Fase 2 `isVitrineState`/hero/carrossel → Task 13; `ends_today` no front → Task 12; dados SSR em paralelo com `watch: [isVitrine]` → Task 17; `HomeSection`, `HeroSavings`, `CategoryGrid`, `OfferTile`, `OfferCarousel`, seção Termina hoje, Novas ofertas, remoção dos Stories → Tasks 14–17; página de categoria → Task 18; API `ends_today` + `slug` + cache v2 + testes → Tasks 1–2; testes vitest listados na spec → Tasks 4, 5, 6, 12, 13 (spec dos Stories removido na 17); verificação de entrega (npm test, build, grep, screenshots, docs) → Tasks 11 e 19.
- **Placeholders:** nenhum "TBD"/"implementar depois"; as varreduras (7–9) usam a tabela de regras com valores literais e ajustes por componente.
- **Consistência de nomes:** `offerBadge`/`savingsPercent` (Task 5) usados em 10, 15, 16; `categoryIcon`/`orderCategories` (6) em 10, 14, 15, 18; `isEndingToday` (4) em 8, 10, 15, 16; `isVitrineState`/`pickHero`/`pickTopSavings` (13) em 17; `JboFacetItem`/`JboFacets.slug` (14) em 14 e 17; `OfferFiltersState.ends_today` (12) em 13 e 17; `ends_today` da API (1) consumido em 17 via `jboGet('/offers', { ends_today: true })`.

