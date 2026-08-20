# Preço com volume e valor unitário — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar `R$ 3,59/330ml` com `R$ 1,09/100ml` (ou `/100g` / `/un`) abaixo, em todo preço de oferta do JBO.

**Architecture:** A API JBO passa a expor `volume_value` e `volume_unit` do produto (o trio de comparação já existe). O Nuxt formata com utils espelhando o Snap (`formatUnitPrice` + sufixo de embalagem) e aplica o layout opção C no `OfferCard` e na página do produto.

**Tech Stack:** Django Ninja + pytest; Nuxt 4, Vue 3, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-20-preco-volume-unitario-design.md`

## Global Constraints

- Layout: preço principal `R$ X/volume`; unitário muted na linha de baixo.
- Sem volume válido → só `R$ X`. Sem trio de comparação → sem linha unitária.
- Não inventar volume no front; não mudar `compute_price_volume_min`.
- Escopo: develop/loc; não mexer no Snap app.
- Preservar WIP alheio nos commits; adicionar só hunks desta feature.
- Tipografia pt-BR; litros como `L`; demais unidades minúsculas.

## File map

| Arquivo | Responsabilidade |
| --- | --- |
| `dev-snap-api/apps/jbo_public/schemas.py` | Campos `volume_value`, `volume_unit` no schema |
| `dev-snap-api/apps/jbo_public/services/serialize.py` | Serializar os dois campos do produto |
| `dev-snap-api/tests/jbo_public/test_offers_api.py` | Assert dos novos campos |
| `dev-joinvilleboasofertas/app/utils/unitPrice.ts` | Formatters puros |
| `dev-joinvilleboasofertas/tests/unitPrice.spec.ts` | Testes dos formatters |
| `dev-joinvilleboasofertas/app/utils/jboApi.ts` | Tipo `JboOffer` |
| `dev-joinvilleboasofertas/app/components/offers/OfferCard.vue` | Layout C no card |
| `dev-joinvilleboasofertas/app/pages/produto/[slug]/[[loja]].vue` | Hero + lista “Onde encontrar” |
| `dev-joinvilleboasofertas/tests/productPage.spec.ts` | Smoke de markup/helpers na página |

---

### Task 1: Expor `volume_value` e `volume_unit` na API JBO

**Files:**
- Modify: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/schemas.py`
- Modify: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/services/serialize.py`
- Test: `/root/Docker/projetos/dev-snap-api/tests/jbo_public/test_offers_api.py`

**Interfaces:**
- Consumes: `Product.volume_value: Decimal | None`, `Product.volume_unit: str`
- Produces: `JboOfferSchema.volume_value: Optional[Decimal]`, `JboOfferSchema.volume_unit: str` (default `""`); mesmas chaves em `serialize_offer`

- [ ] **Step 1: Escrever o teste falhando**

No final de `test_offers_api.py`, adicionar:

```python
def test_offer_includes_product_volume_fields(
    client, jbo_user, jbo_est, make_price_record,
):
    """Oferta pública traz volume bruto do produto para o front formatar."""
    cat = Category.objects.create(name="Bebidas Vol", slug="bebidas-vol-jbo")
    prod = Product.objects.create(
        name="Cerveja Teste 330ml",
        category=cat,
        volume_value=Decimal("330"),
        volume_unit="ml",
    )
    make_price_record(
        user=jbo_user, product=prod, establishment=jbo_est, price=Decimal("3.59"),
    )
    with override_settings(JBO_ESTABLISHMENT_IDS=[str(jbo_est.id)], JBO_BBOX=None):
        r = client.get("/api/public/jbo/offers")
    assert r.status_code == 200
    item = r.json()["items"][0]
    assert item["volume_value"] == "330.000"
    assert item["volume_unit"] == "ml"
    assert item["volume_unit_min"] == "ml"
    assert item["comparison_base"] == 100
    assert item["price_volume_min"] is not None
```

- [ ] **Step 2: Confirmar RED**

Run:

```bash
docker exec snap-api-dev pytest \
  tests/jbo_public/test_offers_api.py::test_offer_includes_product_volume_fields -q
```

Expected: FAIL (`volume_value` / `volume_unit` ausentes no JSON ou KeyError).

- [ ] **Step 3: Implementar schema + serialize**

Em `JboOfferSchema` (após `promo_active`):

```python
volume_value: Optional[Decimal] = None
volume_unit: str = ""
```

(manter `price_volume_min`, `volume_unit_min`, `comparison_base` onde já estão.)

Em `serialize_offer`, junto dos campos de volume já existentes:

```python
"volume_value": rec.product.volume_value,
"volume_unit": rec.product.volume_unit or "",
```

- [ ] **Step 4: Confirmar GREEN**

Run:

```bash
docker exec snap-api-dev pytest \
  tests/jbo_public/test_offers_api.py::test_offer_includes_product_volume_fields -q
```

Expected: PASS. Se `volume_value` vier como `"330"` ou `330.0` em vez de `"330.000"`, ajustar o assert ao formato real do Ninja/JSON (comparar `Decimal(str(item["volume_value"])) == Decimal("330")`).

- [ ] **Step 5: Commit**

```bash
cd /root/Docker/projetos/dev-snap-api
git add apps/jbo_public/schemas.py apps/jbo_public/services/serialize.py \
  tests/jbo_public/test_offers_api.py
git commit -m "$(cat <<'EOF'
feat(jbo): expõe volume_value e volume_unit nas ofertas públicas

EOF
)"
```

---

### Task 2: Utils de formatação no Nuxt (`unitPrice.ts`)

**Files:**
- Create: `/root/Docker/projetos/dev-joinvilleboasofertas/app/utils/unitPrice.ts`
- Create: `/root/Docker/projetos/dev-joinvilleboasofertas/tests/unitPrice.spec.ts`

**Interfaces:**
- Consumes: valores brutos da oferta (`price`, `volume_value`, `volume_unit`, `price_volume_min`, `volume_unit_min`, `comparison_base`)
- Produces:
  - `formatVolumeSuffix(volumeValue, volumeUnit): string | null`
  - `formatUnitPrice({ priceVolumeMin, volumeUnitMin, comparisonBase }): string | null`
  - `formatOfferPrice(offer): string` — sempre pelo menos o `R$ X`

- [ ] **Step 1: Escrever testes falhando**

Criar `tests/unitPrice.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
  formatOfferPrice,
  formatUnitPrice,
  formatVolumeSuffix,
} from '../app/utils/unitPrice'

const nbsp = '\u00a0'

describe('formatVolumeSuffix', () => {
  it('formata ml sem espaço', () => {
    expect(formatVolumeSuffix(330, 'ml')).toBe('330ml')
  })

  it('formata litros com L maiúsculo e vírgula pt-BR', () => {
    expect(formatVolumeSuffix(1.35, 'l')).toBe('1,35L')
  })

  it('formata kg e g', () => {
    expect(formatVolumeSuffix(1, 'kg')).toBe('1kg')
    expect(formatVolumeSuffix(500, 'g')).toBe('500g')
  })

  it('un com value 1 vira un', () => {
    expect(formatVolumeSuffix(1, 'un')).toBe('un')
  })

  it('un com value >1 inclui o número', () => {
    expect(formatVolumeSuffix(12, 'un')).toBe('12un')
  })

  it('bdj e m', () => {
    expect(formatVolumeSuffix(1, 'bdj')).toBe('bdj')
    expect(formatVolumeSuffix(30, 'm')).toBe('30m')
  })

  it('retorna null sem dados válidos', () => {
    expect(formatVolumeSuffix(null, 'ml')).toBeNull()
    expect(formatVolumeSuffix(330, '')).toBeNull()
    expect(formatVolumeSuffix(0, 'ml')).toBeNull()
  })
})

describe('formatUnitPrice', () => {
  it('formata R$/100ml', () => {
    expect(formatUnitPrice({
      priceVolumeMin: '1.0879',
      volumeUnitMin: 'ml',
      comparisonBase: 100,
    })).toBe(`R$${nbsp}1,09/100ml`)
  })

  it('formata R$/un quando base=1', () => {
    expect(formatUnitPrice({
      priceVolumeMin: '2.4992',
      volumeUnitMin: 'un',
      comparisonBase: 1,
    })).toBe(`R$${nbsp}2,50/un`)
  })

  it('usa 4 casas para metro', () => {
    expect(formatUnitPrice({
      priceVolumeMin: '0.0667',
      volumeUnitMin: 'm',
      comparisonBase: 1,
    })).toBe(`R$${nbsp}0,0667/m`)
  })

  it('retorna null incompleto', () => {
    expect(formatUnitPrice({ priceVolumeMin: '1', volumeUnitMin: 'ml' })).toBeNull()
    expect(formatUnitPrice({})).toBeNull()
  })
})

describe('formatOfferPrice', () => {
  it('anexa sufixo de volume', () => {
    expect(formatOfferPrice({
      price: '3.59',
      volume_value: 330,
      volume_unit: 'ml',
    })).toBe(`R$${nbsp}3,59/330ml`)
  })

  it('sem volume fica só o preço', () => {
    expect(formatOfferPrice({ price: '3.59' })).toBe(`R$${nbsp}3,59`)
  })
})
```

- [ ] **Step 2: Confirmar RED**

Run:

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas && npm test -- tests/unitPrice.spec.ts
```

Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `app/utils/unitPrice.ts`**

```typescript
/** Formata preço normalizado e sufixo de embalagem (padrão Snap / e-commerce). */

const BRL_2 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const BRL_4 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

const QTY = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 3,
})

const UNIT_DISPLAY: Record<string, string> = {
  ml: 'ml',
  l: 'L',
  g: 'g',
  kg: 'kg',
  un: 'un',
  bdj: 'bdj',
  m: 'm',
}

export function formatVolumeSuffix(
  volumeValue: string | number | null | undefined,
  volumeUnit: string | null | undefined,
): string | null {
  const unit = String(volumeUnit || '').trim().toLowerCase()
  const label = UNIT_DISPLAY[unit]
  if (!label) return null
  const n = Number(volumeValue)
  if (!Number.isFinite(n) || n <= 0) return null
  if ((unit === 'un' || unit === 'bdj') && n === 1) return label
  return `${QTY.format(n)}${label}`
}

export function formatUnitPrice({
  priceVolumeMin,
  volumeUnitMin,
  comparisonBase,
}: {
  priceVolumeMin?: string | number | null
  volumeUnitMin?: string | null
  comparisonBase?: number | null
} = {}): string | null {
  if (priceVolumeMin == null || !volumeUnitMin || !comparisonBase) return null
  const value = Number(priceVolumeMin)
  if (!Number.isFinite(value) || value <= 0) return null
  const base = Number(comparisonBase)
  if (!Number.isFinite(base) || base <= 0) return null
  const baseLabel = base === 1 ? '' : String(base)
  const formatter = volumeUnitMin === 'm' ? BRL_4 : BRL_2
  return `${formatter.format(value)}/${baseLabel}${volumeUnitMin}`
}

export function formatOfferPrice(offer: {
  price: string | number
  volume_value?: string | number | null
  volume_unit?: string | null
}): string {
  const main = BRL_2.format(Number(offer.price))
  const suffix = formatVolumeSuffix(offer.volume_value, offer.volume_unit)
  return suffix ? `${main}/${suffix}` : main
}
```

- [ ] **Step 4: Confirmar GREEN**

Run:

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas && npm test -- tests/unitPrice.spec.ts
```

Expected: PASS. Se `1,35L` falhar por arredondamento do `Intl`, ajustar `QTY` ou o input do teste.

- [ ] **Step 5: Commit**

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
git add app/utils/unitPrice.ts tests/unitPrice.spec.ts
git commit -m "$(cat <<'EOF'
feat: formatters de preço com volume e valor unitário

EOF
)"
```

---

### Task 3: Tipar `JboOffer` e integrar `OfferCard`

**Files:**
- Modify: `/root/Docker/projetos/dev-joinvilleboasofertas/app/utils/jboApi.ts`
- Modify: `/root/Docker/projetos/dev-joinvilleboasofertas/app/components/offers/OfferCard.vue`
- Modify: `/root/Docker/projetos/dev-joinvilleboasofertas/tests/productPage.spec.ts` (asserts de markup no card)

**Interfaces:**
- Consumes: `formatOfferPrice`, `formatUnitPrice` de `~/utils/unitPrice`
- Produces: card com `deal__price-now` = oferta formatada; `deal__price-unit` opcional abaixo

- [ ] **Step 1: Escrever asserts de markup (RED)**

Em `tests/productPage.spec.ts`, adicionar:

```typescript
it('mostra sufixo de volume e preço unitário no card', () => {
  const card = source('app/components/offers/OfferCard.vue')
  expect(card).toContain('formatOfferPrice')
  expect(card).toContain('formatUnitPrice')
  expect(card).toContain('deal__price-unit')
})
```

- [ ] **Step 2: Confirmar RED**

Run:

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas && npm test -- tests/productPage.spec.ts
```

Expected: FAIL no novo `it`.

- [ ] **Step 3: Atualizar tipo e card**

Em `JboOffer` (`jboApi.ts`), após `comparison_base`:

```typescript
volume_value?: string | number | null
volume_unit?: string
```

Em `OfferCard.vue`:

1. Import:

```typescript
import { formatOfferPrice, formatUnitPrice } from '~/utils/unitPrice'
```

2. Substituir `priceLabel` / adicionar unitário:

```typescript
const priceLabel = computed(() => formatOfferPrice(props.offer))
const unitPriceLabel = computed(() => formatUnitPrice({
  priceVolumeMin: props.offer.price_volume_min,
  volumeUnitMin: props.offer.volume_unit_min,
  comparisonBase: props.offer.comparison_base,
}))
```

3. Template — bloco de preço:

```vue
<div class="deal__price">
  <div class="deal__price-stack">
    <span class="deal__price-now">{{ priceLabel }}</span>
    <span v-if="unitPriceLabel" class="deal__price-unit">{{ unitPriceLabel }}</span>
  </div>
  <span v-if="offer.is_club_price" class="deal__club">{{ clubLabel }}</span>
  <span v-if="hasSavings && avgLabel" class="deal__price-avg">
    média {{ avgLabel }}
  </span>
</div>
```

4. CSS:

```css
.deal__price-stack {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.deal__price-unit {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--muted);
  line-height: 1.2;
}
```

- [ ] **Step 4: Confirmar GREEN**

Run:

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas && npm test -- tests/productPage.spec.ts tests/unitPrice.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
git add app/utils/jboApi.ts app/components/offers/OfferCard.vue tests/productPage.spec.ts
git commit -m "$(cat <<'EOF'
feat: OfferCard mostra volume no preço e valor unitário

EOF
)"
```

---

### Task 4: Página do produto (hero + “Onde encontrar”)

**Files:**
- Modify: `/root/Docker/projetos/dev-joinvilleboasofertas/app/pages/produto/[slug]/[[loja]].vue`
- Modify: `/root/Docker/projetos/dev-joinvilleboasofertas/tests/productPage.spec.ts`

**Interfaces:**
- Consumes: `formatOfferPrice`, `formatUnitPrice`
- Produces: hero e `row__price` no layout C

- [ ] **Step 1: Asserts de markup (RED)**

```typescript
it('mostra volume e unitário no hero e em Onde encontrar', () => {
  const page = source('app/pages/produto/[slug]/[[loja]].vue')
  expect(page).toContain('formatOfferPrice')
  expect(page).toContain('formatUnitPrice')
  expect(page).toContain('hero__price-unit')
  expect(page).toContain('row__price-unit')
})
```

- [ ] **Step 2: Confirmar RED**

Run:

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas && npm test -- tests/productPage.spec.ts
```

Expected: FAIL no novo `it`.

- [ ] **Step 3: Implementar na página**

Import:

```typescript
import { formatOfferPrice, formatUnitPrice } from '~/utils/unitPrice'
```

Trocar `priceLabel` para usar `formatOfferPrice(offer)`.

Helper:

```typescript
function unitPriceLabel(offer: JboOffer) {
  return formatUnitPrice({
    priceVolumeMin: offer.price_volume_min,
    volumeUnitMin: offer.volume_unit_min,
    comparisonBase: offer.comparison_base,
  })
}
```

Hero:

```vue
<div class="hero__price-stack">
  <p class="hero__price">{{ priceLabel(selected) }}</p>
  <p v-if="unitPriceLabel(selected)" class="hero__price-unit">
    {{ unitPriceLabel(selected) }}
  </p>
</div>
```

Lista:

```vue
<span class="row__price" :class="{ 'row__price--expired': isOfferExpired(offer) }">
  <span class="row__price-main">{{ priceLabel(offer) }}</span>
  <span v-if="unitPriceLabel(offer)" class="row__price-unit">
    {{ unitPriceLabel(offer) }}
  </span>
</span>
```

CSS:

```css
.hero__price-stack {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.hero__price-unit {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--muted);
}

.row__price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
  font-weight: 900;
  color: var(--yellow);
  white-space: nowrap;
}

.row__price-unit {
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--muted);
  white-space: nowrap;
}
```

Manter `.row__price--expired` afetando o preço principal (e opcionalmente o unitário com opacidade herdada).

- [ ] **Step 4: Confirmar GREEN**

Run:

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas && npm test -- tests/productPage.spec.ts tests/unitPrice.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
git add 'app/pages/produto/[slug]/[[loja]].vue' tests/productPage.spec.ts
git commit -m "$(cat <<'EOF'
feat: página de produto mostra volume e preço unitário

EOF
)"
```

---

### Task 5: Verificação manual no loc

**Files:** nenhum (rebuild/deploy)

- [ ] **Step 1: Rebuild API se necessário**

Se o container `snap-api-dev` monta o código, o teste da Task 1 já basta. Caso contrário, reiniciar/rebuild conforme o compose do snap-api.

- [ ] **Step 2: Rebuild Nuxt loc**

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
docker compose up -d --build
```

- [ ] **Step 3: Smoke na home e no produto**

Abrir:

- https://joinvilleboasofertas-loc-app.cacin.dev/
- https://joinvilleboasofertas-loc-app.cacin.dev/produto/budweiser-cerveja-budweiser-330ml/atacado-libardo

Conferir: `R$ …/330ml` e linha `R$ …/100ml`. Oferta sem volume não inventa sufixo.

- [ ] **Step 4: Commit vazio não necessário** — só confirmar critério de pronto da spec.

---

## Spec coverage (self-review)

| Requisito da spec | Task |
| --- | --- |
| Expor `volume_value` / `volume_unit` | 1 |
| Manter trio de comparação | 1 (já existia; assert) |
| `formatVolumeSuffix` / `formatUnitPrice` / `formatOfferPrice` | 2 |
| Layout C no card | 3 |
| Layout C no hero + lista | 4 |
| Omitir pedaços ausentes | 2 + UI `v-if` |
| Sem mudar normalização / Snap | implícito (não tocado) |
| Testes API + unit + UI smoke | 1–4 |
| Critério de pronto no loc | 5 |
