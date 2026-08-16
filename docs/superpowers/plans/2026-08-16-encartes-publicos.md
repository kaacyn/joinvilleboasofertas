# Encartes públicos JBO — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expor listagem pública de encartes (`pending`|`approved`) no site JBO, com filtro por loja, ordem por vencimento DESC e lightbox da imagem.

**Architecture:** Endpoint novo em `apps/jbo_public` lista `PhotoScan` no escopo JBO; o Nuxt consome via `jboGet('/encartes')` em `/encartes`, com filtro de loja e lightbox. Status do dataset nunca sai no JSON nem na UI.

**Tech Stack:** Django Ninja (`dev-snap-api`), Nuxt 3 / Vue 3 (`dev-joinvilleboasofertas`), Vitest / pytest

## Global Constraints

- Status elegível: `dataset_status ∈ {pending, approved}` (regra Studio / Instagram button)
- Não expor `dataset_status` no payload nem na UI
- Ordenação fixa: `promo_ends_on DESC`, desempate `created_at DESC`
- Escopo de loja: `jbo_establishments_qs()` / não admin-only + allowlist/bbox
- Exigir `promo_ends_on` não nulo e imagem utilizável
- Incluir vencidos com `promo_active=false` (selo **Expirado** na UI)
- Clique abre lightbox com `image_url_xl`
- Menu: item **Encartes** acima de Privacidade
- Rota UI: `/encartes` (sem página `/encarte/{id}`)
- Auth: público, rate-limit igual aos outros endpoints JBO
- Spec: `docs/superpowers/specs/2026-08-16-encartes-publicos-design.md` (repo Nuxt)

## File map

| Arquivo | Responsabilidade |
|---------|------------------|
| `dev-snap-api/apps/jbo_public/services/encartes.py` | Query, serialize, cursor, listagem |
| `dev-snap-api/apps/jbo_public/schemas.py` | Schemas `JboEncarteSchema`, `JboEncartesPageSchema` |
| `dev-snap-api/apps/jbo_public/api.py` | `GET /encartes` |
| `dev-snap-api/tests/jbo_public/test_encartes_api.py` | Testes do endpoint |
| `dev-joinvilleboasofertas/app/utils/jboApi.ts` | Tipos `JboEncarte` / page |
| `dev-joinvilleboasofertas/app/pages/encartes.vue` | Página pública |
| `dev-joinvilleboasofertas/app/components/encartes/EncarteCard.vue` | Card + selo Expirado |
| `dev-joinvilleboasofertas/app/components/encartes/EncarteLightbox.vue` | Lightbox XL |
| `dev-joinvilleboasofertas/app/components/HeaderMenu.vue` | Link do menu |
| `dev-joinvilleboasofertas/server/routes/sitemap.xml.ts` | Path `/encartes` |
| `dev-joinvilleboasofertas/README.md` | Tabela de rotas |

---

### Task 1: API pública `GET /api/public/jbo/encartes`

**Repo:** `/root/Docker/projetos/dev-snap-api`

**Files:**
- Create: `apps/jbo_public/services/encartes.py`
- Modify: `apps/jbo_public/schemas.py`
- Modify: `apps/jbo_public/api.py`
- Create: `tests/jbo_public/test_encartes_api.py`

**Interfaces:**
- Consome: `jbo_establishments_qs()`, `PhotoScan`, `image_to_url_dict`, `logo_url`
- Produz:
  - `list_encartes(*, establishment_id: UUID | None, cursor: str | None, page_size: int) -> tuple[list[dict], str | None]`
  - `GET /api/public/jbo/encartes` → `{ items, next_cursor }`
  - Item keys: `id`, `establishment_id`, `establishment_name`, `establishment_slug`, `establishment_logo_url`, `promo_starts_on`, `promo_ends_on`, `promo_active`, `image_url`, `image_url_xl` (ISO dates como string `YYYY-MM-DD` ou null; **sem** `dataset_status`)

- [ ] **Step 1: Write the failing tests**

Create `tests/jbo_public/test_encartes_api.py`:

```python
"""Testes do feed público de encartes JBO."""
from datetime import timedelta
from uuid import uuid4

import pytest
from django.test import override_settings
from django.utils import timezone

from apps.establishments.models import Establishment
from apps.images.models import Image
from apps.records.models import PhotoScan
from apps.users.models import User

pytestmark = pytest.mark.django_db


def _est(*, name="Loja A", admin_only=False):
    return Establishment.objects.create(
        name=name,
        address="a",
        lat=-26.3,
        lng=-48.8,
        source=Establishment.SOURCE_MANUAL,
        is_admin_only=admin_only,
    )


def _scan(user, est, *, ends_in=7, status=PhotoScan.DatasetStatus.APPROVED, with_image=True):
    today = timezone.localdate()
    image = None
    if with_image:
        image = Image.objects.create(
            kind=Image.KIND_SCAN_PHOTO,
            owner=user,
            original_key=f"originals/scan_photo/{uuid4()}.jpg",
            original_format="JPEG",
            bytes=1000,
            width=800,
            height=1200,
        )
    return PhotoScan.objects.create(
        user=user,
        establishment=est,
        image=image,
        idempotency_key=str(uuid4()),
        dataset_status=status,
        promo_starts_on=today,
        promo_ends_on=today + timedelta(days=ends_in) if ends_in is not None else None,
    )


@pytest.fixture
def jbo_user(db):
    return User.objects.create_user(email="jbo-enc@x.com", password="x", role="common")


def test_lists_pending_and_approved_ordered_by_ends_desc(client, jbo_user):
    est = _est()
    older = _scan(jbo_user, est, ends_in=3, status=PhotoScan.DatasetStatus.PENDING)
    newer = _scan(jbo_user, est, ends_in=10, status=PhotoScan.DatasetStatus.APPROVED)
    _scan(jbo_user, est, ends_in=5, status=PhotoScan.DatasetStatus.REJECTED)
    with override_settings(JBO_ESTABLISHMENT_IDS=[str(est.id)], JBO_BBOX=None):
        r = client.get("/api/public/jbo/encartes")
    assert r.status_code == 200
    body = r.json()
    ids = [i["id"] for i in body["items"]]
    assert ids == [str(newer.id), str(older.id)]
    assert "dataset_status" not in body["items"][0]
    assert body["items"][0]["promo_active"] is True


def test_includes_expired_with_promo_active_false(client, jbo_user):
    est = _est()
    expired = _scan(jbo_user, est, ends_in=-2)
    with override_settings(JBO_ESTABLISHMENT_IDS=[str(est.id)], JBO_BBOX=None):
        r = client.get("/api/public/jbo/encartes")
    item = r.json()["items"][0]
    assert item["id"] == str(expired.id)
    assert item["promo_active"] is False


def test_filter_by_establishment_id(client, jbo_user):
    a = _est(name="A")
    b = _est(name="B")
    sa = _scan(jbo_user, a, ends_in=4)
    _scan(jbo_user, b, ends_in=8)
    with override_settings(
        JBO_ESTABLISHMENT_IDS=[str(a.id), str(b.id)],
        JBO_BBOX=None,
    ):
        r = client.get(f"/api/public/jbo/encartes?establishment_id={a.id}")
    ids = [i["id"] for i in r.json()["items"]]
    assert ids == [str(sa.id)]


def test_excludes_missing_promo_ends_and_admin_only(client, jbo_user):
    ok = _est(name="Ok")
    admin = _est(name="Admin", admin_only=True)
    _scan(jbo_user, ok, ends_in=None)
    _scan(jbo_user, admin, ends_in=5)
    keep = _scan(jbo_user, ok, ends_in=5)
    with override_settings(
        JBO_ESTABLISHMENT_IDS=[str(ok.id), str(admin.id)],
        JBO_BBOX=None,
    ):
        r = client.get("/api/public/jbo/encartes")
    ids = [i["id"] for i in r.json()["items"]]
    assert ids == [str(keep.id)]
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /root/Docker/projetos/dev-snap-api
pytest tests/jbo_public/test_encartes_api.py -v
```

Expected: FAIL (404 ou import/rota inexistente).

- [ ] **Step 3: Implement schemas**

In `apps/jbo_public/schemas.py`, append:

```python
class JboEncarteSchema(Schema):
    id: UUID
    establishment_id: UUID
    establishment_name: str
    establishment_slug: str
    establishment_logo_url: Optional[str] = None
    promo_starts_on: Optional[str] = None
    promo_ends_on: str
    promo_active: bool
    image_url: Optional[str] = None
    image_url_xl: Optional[str] = None


class JboEncartesPageSchema(Schema):
    items: list[JboEncarteSchema]
    next_cursor: Optional[str] = None
```

(Import `UUID` / `Optional` / `Schema` já usados no arquivo.)

- [ ] **Step 4: Implement service**

Create `apps/jbo_public/services/encartes.py`:

```python
"""Listagem pública de encartes (PhotoScan) para o JBO."""
from __future__ import annotations

import base64
from datetime import date
from typing import Optional
from uuid import UUID

from django.db.models import Q
from django.utils import timezone

from apps.establishments.services.logo import logo_url
from apps.jbo_public.scope import jbo_establishments_qs
from apps.records.models import PhotoScan
from services.images.serialize import image_to_url_dict


def _iso(d: Optional[date]) -> Optional[str]:
    return d.isoformat() if d else None


def _promo_active(scan: PhotoScan, today: date) -> bool:
    if scan.promo_ends_on is None:
        return True
    if scan.promo_ends_on < today:
        return False
    if scan.promo_starts_on is not None and scan.promo_starts_on > today:
        return False
    return True


def encode_encarte_cursor(ends: date, created_iso: str, scan_id: str) -> str:
    raw = f"{ends.isoformat()}|{created_iso}|{scan_id}".encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def decode_encarte_cursor(token: Optional[str]) -> Optional[tuple[date, str, str]]:
    if not token:
        return None
    try:
        padded = token + "=" * (-len(token) % 4)
        raw = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
        ends_s, created_iso, scan_id = raw.split("|", 2)
        return date.fromisoformat(ends_s), created_iso, scan_id
    except (ValueError, UnicodeDecodeError, base64.binascii.Error):
        return None


def serialize_encarte(scan: PhotoScan, today: Optional[date] = None) -> dict:
    today = today or timezone.localdate()
    image_url = image_url_xl = None
    if scan.image_id:
        urls = image_to_url_dict(scan.image, presets=("md", "xl")).get("urls", {})
        image_url = urls.get("md")
        image_url_xl = urls.get("xl")
    return {
        "id": scan.id,
        "establishment_id": scan.establishment_id,
        "establishment_name": scan.establishment.name,
        "establishment_slug": scan.establishment.slug or "",
        "establishment_logo_url": logo_url(scan.establishment),
        "promo_starts_on": _iso(scan.promo_starts_on),
        "promo_ends_on": _iso(scan.promo_ends_on),
        "promo_active": _promo_active(scan, today),
        "image_url": image_url,
        "image_url_xl": image_url_xl,
    }


def list_encartes(
    *,
    establishment_id: Optional[UUID] = None,
    cursor: Optional[str] = None,
    page_size: int = 20,
) -> tuple[list[dict], Optional[str]]:
    est_ids = list(jbo_establishments_qs().values_list("id", flat=True))
    qs = (
        PhotoScan.objects.filter(
            dataset_status__in=[
                PhotoScan.DatasetStatus.PENDING,
                PhotoScan.DatasetStatus.APPROVED,
            ],
            establishment_id__in=est_ids,
            promo_ends_on__isnull=False,
            image__isnull=False,
            image__original_key__gt="",
        )
        .select_related("establishment", "image")
        .order_by("-promo_ends_on", "-created_at", "-id")
    )
    if establishment_id is not None:
        qs = qs.filter(establishment_id=establishment_id)

    decoded = decode_encarte_cursor(cursor)
    if decoded:
        ends, created_iso, scan_id = decoded
        qs = qs.filter(
            Q(promo_ends_on__lt=ends)
            | Q(promo_ends_on=ends, created_at__lt=created_iso)
            | Q(promo_ends_on=ends, created_at=created_iso, id__lt=scan_id)
        )

    page = list(qs[: page_size + 1])
    nxt = None
    if len(page) > page_size:
        last = page[page_size - 1]
        nxt = encode_encarte_cursor(
            last.promo_ends_on,
            last.created_at.isoformat(),
            str(last.id),
        )
        page = page[:page_size]

    today = timezone.localdate()
    return [serialize_encarte(s, today) for s in page], nxt
```

Ajuste o filtro de cursor se `created_at` for timezone-aware: compare com `last.created_at` tipado (parse ISO) em vez de string, se os testes de paginação exigirem — para a Task 1 a paginação pode ser coberta depois; o filtro `Q(... created_at__lt=created_iso)` deve usar `datetime.fromisoformat(created_iso)` se o ORM reclamar.

- [ ] **Step 5: Wire the endpoint**

In `apps/jbo_public/api.py`, import schemas + `list_encartes` e adicione:

```python
@router.get("/encartes", response={200: JboEncartesPageSchema})
@ratelimit(key="ip", rate="60/m", block=True)
def encartes_feed(
    request,
    establishment_id: Optional[UUID] = None,
    cursor: Optional[str] = None,
    page_size: int = 20,
):
    """Lista encartes pendentes/aprovados no escopo Joinville."""
    if page_size < 1:
        page_size = 1
    if page_size > 50:
        page_size = 50
    items, nxt = list_encartes(
        establishment_id=establishment_id,
        cursor=cursor,
        page_size=page_size,
    )
    return {"items": items, "next_cursor": nxt}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pytest tests/jbo_public/test_encartes_api.py -v
```

Expected: PASS (todos).

- [ ] **Step 7: Commit (repo snap-api)**

```bash
git add apps/jbo_public/services/encartes.py \
  apps/jbo_public/schemas.py \
  apps/jbo_public/api.py \
  tests/jbo_public/test_encartes_api.py
git commit -m "$(cat <<'EOF'
feat: endpoint público JBO de encartes pendentes/aprovados

EOF
)"
```

---

### Task 2: Página Nuxt `/encartes` + menu + lightbox

**Repo:** `/root/Docker/projetos/dev-joinvilleboasofertas`

**Files:**
- Modify: `app/utils/jboApi.ts`
- Create: `app/components/encartes/EncarteCard.vue`
- Create: `app/components/encartes/EncarteLightbox.vue`
- Create: `app/pages/encartes.vue`
- Modify: `app/components/HeaderMenu.vue`
- Create: `tests/encartesPage.spec.ts` (smoke de tipos/copy estáticos se útil; mínimo: teste que o menu declara `/encartes`)

**Interfaces:**
- Consome: `GET /api/public/jbo/encartes`, `GET /api/public/jbo/establishments`
- Produz: rota `/encartes`, item de menu **Encartes**, lightbox

- [ ] **Step 1: Extend types in `jboApi.ts`**

```ts
export type JboEncarte = {
  id: string
  establishment_id: string
  establishment_name: string
  establishment_slug: string
  establishment_logo_url?: string | null
  promo_starts_on?: string | null
  promo_ends_on: string
  promo_active: boolean
  image_url?: string | null
  image_url_xl?: string | null
}

export type JboEncartesPage = {
  items: JboEncarte[]
  next_cursor: string | null
}
```

- [ ] **Step 2: Write failing menu integration assertion**

Extend `tests/navigationIntegration.spec.ts` (ou criar `tests/encartesMenu.spec.ts`):

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('menu Encartes', () => {
  it('declara link /encartes no HeaderMenu', () => {
    const src = readFileSync('app/components/HeaderMenu.vue', 'utf8')
    expect(src).toContain('to="/encartes"')
    expect(src).toContain('Encartes')
  })
})
```

Run: `npm test -- --run tests/encartesMenu.spec.ts`  
Expected: FAIL até o menu ser atualizado.

- [ ] **Step 3: Add menu item**

In `HeaderMenu.vue`, **acima** do link de Privacidade:

```vue
<NuxtLink
  to="/encartes"
  class="hmenu__item"
  role="menuitem"
  @click="close"
>
  Encartes
</NuxtLink>
```

- [ ] **Step 4: Implement `EncarteCard.vue`**

```vue
<template>
  <button type="button" class="card" @click="$emit('open', encarte)">
    <img
      v-if="encarte.image_url"
      class="card__img"
      :src="encarte.image_url"
      :alt="`Encarte ${encarte.establishment_name}`"
      loading="lazy"
    >
    <div class="card__meta">
      <span class="card__store">{{ encarte.establishment_name }}</span>
      <span class="card__dates">
        Válido até {{ formatDate(encarte.promo_ends_on) }}
      </span>
      <span v-if="!encarte.promo_active" class="card__expired">Expirado</span>
    </div>
  </button>
</template>

<script setup lang="ts">
import type { JboEncarte } from '~/utils/jboApi'

defineProps<{ encarte: JboEncarte }>()
defineEmits<{ open: [JboEncarte] }>()

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
</script>
```

Estilizar no padrão visual JBO (navy/yellow, sem cards excessivos se o design system local preferir lista — manter um bloco clicável claro).

- [ ] **Step 5: Implement `EncarteLightbox.vue`**

```vue
<template>
  <div class="lb" role="dialog" aria-modal="true" aria-label="Encarte ampliado" @click.self="$emit('close')">
    <button type="button" class="lb__close" aria-label="Fechar" @click="$emit('close')">×</button>
    <img
      v-if="encarte.image_url_xl || encarte.image_url"
      class="lb__img"
      :src="encarte.image_url_xl || encarte.image_url || ''"
      :alt="`Encarte ${encarte.establishment_name}`"
    >
  </div>
</template>

<script setup lang="ts">
import type { JboEncarte } from '~/utils/jboApi'

const props = defineProps<{ encarte: JboEncarte }>()
const emit = defineEmits<{ close: [] }>()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>
```

- [ ] **Step 6: Implement `pages/encartes.vue`**

```vue
<template>
  <div class="page">
    <AppHeader />
    <main class="page__main">
      <header class="page__intro">
        <h1>Encartes</h1>
        <p>Encartes das lojas de Joinville e região.</p>
      </header>

      <label class="filter">
        <span class="sr-only">Filtrar por loja</span>
        <select v-model="establishmentId" class="filter__select">
          <option value="">Todas as lojas</option>
          <option v-for="e in stores" :key="e.id" :value="e.id">{{ e.name }}</option>
        </select>
      </label>

      <p v-if="pending && !items.length" class="muted">Carregando…</p>
      <p v-else-if="loadError" class="muted">Não foi possível carregar os encartes.</p>
      <p v-else-if="!items.length" class="muted">Nenhum encarte encontrado.</p>

      <div v-else class="grid">
        <EncarteCard
          v-for="enc in items"
          :key="enc.id"
          :encarte="enc"
          @open="open = $event"
        />
      </div>

      <button
        v-if="nextCursor"
        type="button"
        class="more"
        :disabled="loadingMore"
        @click="loadMore"
      >
        {{ loadingMore ? 'Carregando…' : 'Carregar mais' }}
      </button>
    </main>

    <EncarteLightbox v-if="open" :encarte="open" @close="open = null" />
  </div>
</template>

<script setup lang="ts">
import { jboGet, type JboEncarte, type JboEncartesPage } from '~/utils/jboApi'

type Store = { id: string, name: string, slug: string }

const establishmentId = ref('')
const open = ref<JboEncarte | null>(null)
const items = ref<JboEncarte[]>([])
const nextCursor = ref<string | null>(null)
const loadingMore = ref(false)
const loadError = ref(false)

const { data: storesData } = await useAsyncData('jbo-encartes-stores', () =>
  jboGet<{ items: Store[] }>('/establishments'),
)
const stores = computed(() => storesData.value?.items || [])

async function fetchPage(cursor?: string | null) {
  return jboGet<JboEncartesPage>('/encartes', {
    establishment_id: establishmentId.value || undefined,
    cursor: cursor || undefined,
    page_size: 20,
  })
}

const { pending, refresh, error } = await useAsyncData(
  () => `jbo-encartes-${establishmentId.value || 'all'}`,
  async () => {
    loadError.value = false
    const page = await fetchPage(null)
    items.value = page.items
    nextCursor.value = page.next_cursor
    return page
  },
  { watch: [establishmentId] },
)

watch(error, (e) => { loadError.value = Boolean(e) })

async function loadMore() {
  if (!nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const page = await fetchPage(nextCursor.value)
    items.value = [...items.value, ...page.items]
    nextCursor.value = page.next_cursor
  }
  finally {
    loadingMore.value = false
  }
}

useSeoMeta({
  title: 'Encartes | Joinville Boas Ofertas',
  description: 'Encartes das lojas de Joinville e região.',
})
</script>
```

Registrar componentes automaticamente via Nuxt (pasta `components/encartes/`). Ajustar CSS scoped no estilo das páginas existentes (`lojas.vue`).

- [ ] **Step 7: Run frontend tests**

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
npm test -- --run
npm run build
```

Expected: PASS / build OK.

- [ ] **Step 8: Commit (repo Nuxt)**

```bash
git add app/utils/jboApi.ts \
  app/components/encartes \
  app/pages/encartes.vue \
  app/components/HeaderMenu.vue \
  tests
git commit -m "$(cat <<'EOF'
feat: página pública de encartes com filtro e lightbox

EOF
)"
```

---

### Task 3: Sitemap, README e verificação deploy

**Repos:**
- `dev-joinvilleboasofertas` (sitemap/README/deploy)
- Confirmar API no container `snap-api-dev` se o código da Task 1 ainda não estiver no processo em execução (restart se necessário)

**Files:**
- Modify: `server/routes/sitemap.xml.ts`
- Modify: `README.md`

- [ ] **Step 1: Add `/encartes` to Nuxt sitemap paths**

Em `server/routes/sitemap.xml.ts`, incluir `'/encartes'` nos arrays estáticos mínimos (junto de `/`, `/lojas`, `/privacidade`, `/termos`).

- [ ] **Step 2: Update README routes table**

```markdown
| `/encartes` | Lista de encartes (filtro por loja) |
```

- [ ] **Step 3: Restart API if needed + rebuild Nuxt**

```bash
# API (se o processo não recarrega sozinho)
docker restart snap-api-dev

cd /root/Docker/projetos/dev-joinvilleboasofertas
docker compose up -d --build app
```

- [ ] **Step 4: Smoke HTTP**

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://joinvilleboasofertas-loc-app.cacin.dev/encartes
curl -sS 'https://joinvilleboasofertas-loc-app.cacin.dev/api/public/jbo/encartes?page_size=5' | head -c 400
curl -sS https://joinvilleboasofertas-loc-app.cacin.dev/sitemap.xml | rg -n '/encartes|/estabelecimentos|/mercado/'
```

Expected:

- `/encartes` → `200`
- JSON com `items` sem campo `dataset_status`; ordenação por `promo_ends_on` desc quando houver dados
- Sitemap contém `/encartes`

- [ ] **Step 5: Commit**

```bash
git add server/routes/sitemap.xml.ts README.md
git commit -m "$(cat <<'EOF'
fix: incluir /encartes no sitemap e README

EOF
)"
```

---

## Spec coverage

| Requisito | Task |
|-----------|------|
| Endpoint + critérios pending/approved | 1 |
| Filtro loja + ordem vencimento DESC | 1–2 |
| Sem status no JSON/UI | 1–2 |
| Página + menu + lightbox | 2 |
| Selo Expirado | 2 |
| Sitemap `/encartes` | 3 |
| Deploy/smoke | 3 |

## Placeholder / consistency self-review

- Sem TBD.
- Nomes de campos alinhados entre API schema, `JboEncarte` e UI.
- Cursor de encartes isolado do cursor de ofertas (`encode_encarte_cursor`).
- Dois repositórios: cada task indica o `cd` correto e commits separados.
