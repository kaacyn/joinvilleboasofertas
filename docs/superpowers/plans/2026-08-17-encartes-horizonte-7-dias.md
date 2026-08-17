# Horizonte de 7 dias nos encartes públicos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Excluir do feed/stores públicos encartes com `promo_ends_on > hoje + 7 dias`, mantendo vencidos.

**Architecture:** Um filtro adicional em `eligible_encartes_qs()` com constante `ENCARTE_HORIZON_DAYS = 7`, para que feed e `/encartes/stores` compartilhem a mesma regra. Frontend sem mudança de código.

**Tech Stack:** Django + pytest (`dev-snap-api`), `timezone.localdate()`

## Global Constraints

- Regra fixa: `promo_ends_on <= localdate() + 7` (inclusivo no 7º dia)
- Vencidos (`promo_ends_on < hoje`) continuam
- Não usar `jbo_establishments_qs` / WIP de logos
- Preservar WIP alheio da API no working tree; stage só os hunks desta feature
- Não alterar Nuxt

---

### Task 1: Filtro de horizonte em `eligible_encartes_qs`

**Files:**
- Modify: `apps/jbo_public/services/encartes.py`
- Modify: `tests/jbo_public/test_encartes_api.py`

**Interfaces:**
- Consumes: `eligible_encartes_qs()`, helpers `_scan(..., ends_in=...)`, `list_encarte_stores`
- Produces: queryset com `promo_ends_on__lte=today + ENCARTE_HORIZON_DAYS`

- [ ] **Step 1: Ajustar testes existentes que usam horizonte > 7**

Em `test_lists_pending_and_approved_ordered_by_ends_desc`, trocar `ends_in=10` por `ends_in=7`.

Em `test_cursor_pages_without_duplicates_in_global_ends_desc_order`, trocar a lista `[2, 8, 8, 10, 6]` por valores todos `<= 7`, por exemplo `[2, 7, 7, 5, 6]`, para a paginação continuar válida após o filtro.

- [ ] **Step 2: Escrever testes novos (TDD RED)**

```python
def test_excludes_encartes_beyond_seven_day_horizon(client, jbo_user):
    est = _est()
    inside = _scan(jbo_user, est, ends_in=7)
    _scan(jbo_user, est, ends_in=8)
    expired = _scan(jbo_user, est, ends_in=-1)

    with override_settings(JBO_ESTABLISHMENT_IDS=[str(est.id)], JBO_BBOX=None):
        response = client.get("/api/public/jbo/encartes")

    assert response.status_code == 200
    ids = [item["id"] for item in response.json()["items"]]
    assert ids == [str(inside.id), str(expired.id)]


def test_stores_omit_loja_with_only_beyond_horizon_encartes(client, jbo_user):
    far = _est(name="Longe")
    near = _est(name="Perto")
    _scan(jbo_user, far, ends_in=8)
    _scan(jbo_user, near, ends_in=3)

    with override_settings(
        JBO_ESTABLISHMENT_IDS=[str(far.id), str(near.id)],
        JBO_BBOX=None,
    ):
        response = client.get("/api/public/jbo/encartes/stores")

    assert response.status_code == 200
    names = [item["name"] for item in response.json()["items"]]
    assert names == ["Perto"]
```

- [ ] **Step 3: Rodar testes e confirmar RED**

Run: `pytest tests/jbo_public/test_encartes_api.py::test_excludes_encartes_beyond_seven_day_horizon tests/jbo_public/test_encartes_api.py::test_stores_omit_loja_with_only_beyond_horizon_encartes -q`

Expected: FAIL (itens além de 7 dias ainda aparecem)

- [ ] **Step 4: Implementar filtro**

Em `apps/jbo_public/services/encartes.py`:

```python
from datetime import date, datetime, timedelta

ENCARTE_HORIZON_DAYS = 7

def eligible_encartes_qs():
    today = timezone.localdate()
    horizon = today + timedelta(days=ENCARTE_HORIZON_DAYS)
    return apply_jbo_scope(
        PhotoScan.objects.filter(
            dataset_status__in=[
                PhotoScan.DatasetStatus.PENDING,
                PhotoScan.DatasetStatus.APPROVED,
            ],
            promo_ends_on__isnull=False,
            promo_ends_on__lte=horizon,
            image__isnull=False,
            image__original_key__gt="",
        )
    )
```

- [ ] **Step 5: Rodar suíte de encartes (GREEN)**

Run: `pytest tests/jbo_public/test_encartes_api.py -q`

Expected: all passed

- [ ] **Step 6: Commit (somente arquivos desta feature)**

```bash
cd /root/Docker/projetos/dev-snap-api
git add apps/jbo_public/services/encartes.py tests/jbo_public/test_encartes_api.py
git commit -m "fix: limita encartes públicos ao horizonte de 7 dias"
```

- [ ] **Step 7: Smoke rápido**

`GET /api/public/jbo/encartes?limit=20` — nenhum `promo_ends_on` > hoje+7; vencidos ainda podem aparecer.
