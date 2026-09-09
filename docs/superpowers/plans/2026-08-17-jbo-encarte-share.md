# Compartilhar encarte e página `/encarte/{id}` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada encarte elegível tem URL pública `/encarte/{id}` com Open Graph, e o card ganha três pontinhos que disparam a folha nativa de compartilhar (ou copiam o link).

**Architecture:** `GET /api/public/jbo/encartes/{id}` reusa `eligible_encartes_qs` + `serialize_encarte`. A página Nuxt busca esse detalhe. O card deixa de ser um `<button>` único: `article` + botão de abrir + botão ⋯ irmão.

**Tech Stack:** Django Ninja, pytest, Nuxt 4, Vitest.

## Global Constraints

- Sem login. Sem `dataset_status` no JSON.
- Rota de detalhe **depois** de `/encartes` e `/encartes/stores`; `id` é UUID.
- 404 único para inexistente, rejeitado, fora do horizonte ou fora do escopo; expirado **entra**.
- Compartilhar: `navigator.share` se existir; senão clipboard + confirmação.
- URL compartilhada: `{origin}/encarte/{id}`.
- Preservar WIP alheio na API; stage só hunks desta fatia.
- Spec: `docs/superpowers/specs/2026-08-17-jbo-pwa-push-share-design.md`.
- Depende visualmente do card 9:16 já no working tree; não reverter miniatura/logo.

---

### Task 1: Detalhe público na API

**Files:**
- Modify: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/services/encartes.py`
- Modify: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/api.py`
- Modify: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/services/sitemap.py` (incluir `/encarte/{id}` para elegíveis)
- Test: `/root/Docker/projetos/dev-snap-api/tests/jbo_public/test_encartes_api.py`

**Interfaces:**
- Produces: `get_encarte(scan_id: UUID) -> dict | None`
- Produces: `GET /api/public/jbo/encartes/{id}` → `JboEncarteSchema` ou 404
- Consumes: `eligible_encartes_qs()`, `serialize_encarte()`

- [ ] **Step 1: Testes**

```python
def test_encarte_detail_returns_eligible_including_expired(client, jbo_user):
    est = _est()
    live = _scan(jbo_user, est, ends_in=3)
    expired = _scan(jbo_user, est, ends_in=-1)
    with override_settings(JBO_ESTABLISHMENT_IDS=[str(est.id)], JBO_BBOX=None):
        ok = client.get(f"/api/public/jbo/encartes/{live.id}")
        gone = client.get(f"/api/public/jbo/encartes/{expired.id}")
    assert ok.status_code == 200
    assert ok.json()["id"] == str(live.id)
    assert "dataset_status" not in ok.json()
    assert gone.status_code == 200
    assert gone.json()["promo_active"] is False


def test_encarte_detail_404_for_rejected_and_beyond_horizon(client, jbo_user):
    est = _est()
    rejected = _scan(jbo_user, est, status=PhotoScan.DatasetStatus.REJECTED)
    far = _scan(jbo_user, est, ends_in=8)
    with override_settings(JBO_ESTABLISHMENT_IDS=[str(est.id)], JBO_BBOX=None):
        assert client.get(f"/api/public/jbo/encartes/{rejected.id}").status_code == 404
        assert client.get(f"/api/public/jbo/encartes/{far.id}").status_code == 404


def test_encartes_stores_still_wins_over_detail(client, jbo_user):
    with override_settings(JBO_ESTABLISHMENT_IDS=[], JBO_BBOX=None):
        response = client.get("/api/public/jbo/encartes/stores")
    assert response.status_code == 200
    assert "items" in response.json()
```

- [ ] **Step 2: RED** — `docker exec snap-api-dev pytest tests/jbo_public/test_encartes_api.py::test_encarte_detail_returns_eligible_including_expired -q`

- [ ] **Step 3: Implementar**

```python
def get_encarte(scan_id: UUID) -> Optional[dict]:
    scan = (
        eligible_encartes_qs()
        .select_related("establishment", "establishment__logo_image", "image")
        .filter(pk=scan_id)
        .first()
    )
    if scan is None:
        return None
    return serialize_encarte(scan)
```

Em `api.py`, **abaixo** de `/encartes/stores`:

```python
@router.get("/encartes/{encarte_id}", response={200: JboEncarteSchema})
@ratelimit(key="ip", rate="60/m", block=True)
def encarte_detail(request, encarte_id: UUID):
    item = get_encarte(encarte_id)
    if item is None:
        raise HttpError(404, "Encarte não encontrado")
    return item
```

Sitemap: acrescentar `loc: f"/encarte/{scan.id}"` para cada elegível (ou os N mais recentes se o sitemap já paginar — seguir o padrão atual de `build_sitemap_urls`).

- [ ] **Step 4: GREEN + commit só hunks desta fatia**

```bash
git commit -m "feat: detalhe público de encarte por id"
```

---

### Task 2: Client, página e OG

**Files:**
- Modify: `app/utils/jboApi.ts` — `jboGet<JboEncarte>(\`/encartes/${id}\`)`
- Create: `app/pages/encarte/[id].vue`
- Modify: `tests/encartesPage.spec.ts`
- Modify: `server/routes/sitemap.xml.ts` se paths estáticos precisarem de nota (API já manda `/encarte/…`)

- [ ] **Step 1: Teste**

```ts
it('tem página pública /encarte/[id] com OG e fetch do detalhe', () => {
  const page = source('app/pages/encarte/[id].vue')
  expect(page).toContain("jboGet<JboEncarte>(`/encartes/${")
  expect(page).toContain('og:image')
  expect(page).toContain('useSeoMeta')
})
```

- [ ] **Step 2: RED → página**

`useAsyncData` + `jboGet`. 404 via `createError({ statusCode: 404 })`. Imagem `image_url_xl || image_url`. Loja + logo + datas + `formatRegisteredAt` (reusar `useState('encartes:rendered-at')` ou um key próprio da página). OG:

```ts
const site = useRuntimeConfig().public.siteUrl
useSeoMeta({
  title: () => `Encarte ${data.value?.establishment_name || ''} | Joinville Boas Ofertas`,
  ogImage: () => data.value?.image_url_xl || data.value?.image_url || undefined,
  description: () => data.value
    ? `Encarte válido até ${formatDate(data.value.promo_ends_on)}`
    : undefined,
})
```

`og:image` precisa ser absoluta: prefixar `site` se a URL for relativa.

- [ ] **Step 3: GREEN + commit**

```bash
git commit -m "feat: página pública /encarte/{id} com Open Graph"
```

---

### Task 3: Decompor o card e o botão ⋯

**Files:**
- Modify: `app/components/encartes/EncarteCard.vue`
- Create: `app/utils/shareEncarte.ts`
- Create: `tests/shareEncarte.spec.ts`
- Modify: `tests/encartesPage.spec.ts`

**Interfaces:**
- Produces: `shareEncarte({ title, text, url }: SharePayload): Promise<'shared' | 'copied' | 'shown'>`
- Produces: card outer `<article>`; nenhum `<button>` ancestral de outro `<button>`

- [ ] **Step 1: Testes**

```ts
it('decompõe o card: article com abrir e compartilhar irmãos', () => {
  const card = source('app/components/encartes/EncarteCard.vue')
  expect(card).toMatch(/<article[\s\S]*class="card"/)
  expect(card).not.toMatch(/<button[\s\S]*class="card"/)
  expect(card).toContain('shareEncarte')
  expect(card).toContain('aria-label="Compartilhar encarte"')
})
```

```ts
// tests/shareEncarte.spec.ts
it('usa navigator.share quando existe', async () => {
  const share = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { share, clipboard: { writeText: vi.fn() } })
  const { shareEncarte } = await import('../app/utils/shareEncarte')
  await expect(shareEncarte({
    title: 'Loja',
    text: 'Encarte',
    url: 'https://example.com/encarte/1',
  })).resolves.toBe('shared')
  expect(share).toHaveBeenCalled()
})
```

- [ ] **Step 2: RED → helper + markup**

```html
<article class="card" :class="{ 'card--expired': !encarte.promo_active }">
  <span class="card__media">
    <!-- fill + img existentes -->
    <button type="button" class="card__share" aria-label="Compartilhar encarte" @click="onShare">⋯</button>
  </span>
  <button type="button" class="card__open" @click="$emit('open', encarte)">
    <span class="card__meta">…</span>
  </button>
</article>
```

`onShare`: `shareEncarte({ title: encarte.establishment_name, text: 'Encarte', url: `${origin}/encarte/${encarte.id}` })`.

Hit target do ⋯ ≥ 44px, canto da mídia, `z-index` acima da imagem.

- [ ] **Step 3: GREEN + commit**

```bash
git commit -m "feat: compartilha encarte pela folha nativa ou copiar link"
```

Colocar o mesmo ⋯ na página `/encarte/[id].vue`.

---

## Verificação da fatia

`GET /api/public/jbo/encartes/{uuid}` 200/404. Abrir `/encarte/{uuid}` no loc; WhatsApp preview usa `og:image`. ⋯ no card não abre o lightbox; no celular abre o share sheet.
