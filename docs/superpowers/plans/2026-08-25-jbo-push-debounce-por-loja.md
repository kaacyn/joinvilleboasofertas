# Debounce de push de encartes por loja — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enviar no máximo um Web Push por supermercado após 15 min sem novos encartes elegíveis, com link para `/encartes?establishment_ids={uuid}`.

**Architecture:** Cada encarte elegível entra em `JboEncartePushPending` e atualiza `JboStoreEncartePushWindow.quiet_until = now + 15min`. Celery Beat a cada 1 min chama `flush_due_store_windows()`, que cria uma campanha `encarte` (sem `photo_scan` 1:1) e faz fan-out. Sem push imediato por scan.

**Tech Stack:** Django + Celery Beat (`dev-snap-api`), pytest

**Spec:** `dev-joinvilleboasofertas/docs/superpowers/specs/2026-08-25-jbo-push-debounce-por-loja-design.md`

## Global Constraints

- Debounce 15 min por loja; cada novo encarte elegível reinicia `quiet_until`
- URL: `/encartes?establishment_ids={establishment.id}`
- title = nome da loja; body = `Novas ofertas`
- Sem push automático com `/encarte/{id}`
- Campanhas manuais inalteradas
- Não espelhar `prd-snap-api` neste ciclo
- Work from: `/root/Docker/projetos/dev-snap-api`
- Preservar WIP; stage só arquivos da feature

## File map

| File | Role |
|------|------|
| `apps/jbo_public/models.py` | `JboEncartePushPending`, `JboStoreEncartePushWindow`, M2M `photo_scans` na campanha |
| `apps/jbo_public/migrations/00XX_*.py` | Migration |
| `apps/jbo_public/services/encarte_push.py` | schedule + flush + constantes |
| `apps/jbo_public/services/push_campaigns.py` | `create_store_encarte_campaign` |
| `apps/jbo_public/tasks.py` | task `flush_jbo_store_encarte_push_windows` |
| `config/celery.py` | Beat `*/1` |
| `tests/jbo_public/test_jbo_encarte_push.py` | Reescrever para debounce |

---

### Task 1: Modelos de pendência e janela

**Files:**
- Modify: `apps/jbo_public/models.py`
- Create: migration via `makemigrations jbo_public`
- Create: `tests/jbo_public/test_encarte_push_debounce_models.py`

**Interfaces:**
- Produces:
  - `JboEncartePushPending(establishment, photo_scan unique, created_at, notified_at nullable)`
  - `JboStoreEncartePushWindow(establishment OneToOne PK/FK, quiet_until, updated_at)`
  - `JboPushCampaign.photo_scans` M2M to PhotoScan (blank)

- [ ] **Step 1: Teste RED de constraints**

```python
"""Modelos de debounce de push por loja."""
import pytest
from django.db import IntegrityError
from django.utils import timezone

from apps.establishments.models import Establishment
from apps.jbo_public.models import JboEncartePushPending, JboStoreEncartePushWindow
# reutilizar helpers _est/_scan de test_jbo_encarte_push ou duplicar mínimo

pytestmark = pytest.mark.django_db


def test_pending_photo_scan_unique(jbo_user):
    est = Establishment.objects.create(
        name="L", address="a", lat=-26.3, lng=-48.8,
        source=Establishment.SOURCE_MANUAL,
    )
    # criar 1 PhotoScan via helper existente do arquivo vizinho
    from tests.jbo_public.test_jbo_encarte_push import _scan
    scan = _scan(jbo_user, est)
    JboEncartePushPending.objects.create(establishment=est, photo_scan=scan)
    with pytest.raises(IntegrityError):
        JboEncartePushPending.objects.create(establishment=est, photo_scan=scan)


def test_window_one_per_establishment():
    est = Establishment.objects.create(
        name="W", address="a", lat=-26.3, lng=-48.8,
        source=Establishment.SOURCE_MANUAL,
    )
    now = timezone.now()
    JboStoreEncartePushWindow.objects.create(
        establishment=est, quiet_until=now,
    )
    with pytest.raises(IntegrityError):
        JboStoreEncartePushWindow.objects.create(
            establishment=est, quiet_until=now,
        )
```

(Se import cruzado de helpers for frágil, copiar `_scan`/`_est` mínimos no arquivo de teste.)

- [ ] **Step 2: RED**

```bash
docker compose --env-file .env --env-file .env.loc --env-file .env.compose exec -T snap-api \
  pytest tests/jbo_public/test_encarte_push_debounce_models.py -q
```

Expected: FAIL (modelos inexistentes)

- [ ] **Step 3: Modelos**

Em `models.py`:

```python
class JboEncartePushPending(models.Model):
    establishment = models.ForeignKey(
        "establishments.Establishment",
        on_delete=models.CASCADE,
        related_name="jbo_encarte_push_pending",
    )
    photo_scan = models.OneToOneField(
        "records.PhotoScan",
        on_delete=models.CASCADE,
        related_name="jbo_encarte_push_pending",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    notified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["establishment", "notified_at"]),
        ]


class JboStoreEncartePushWindow(models.Model):
    establishment = models.OneToOneField(
        "establishments.Establishment",
        on_delete=models.CASCADE,
        related_name="jbo_encarte_push_window",
        primary_key=True,
    )
    quiet_until = models.DateTimeField(db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
```

Em `JboPushCampaign`, adicionar:

```python
    photo_scans = models.ManyToManyField(
        "records.PhotoScan",
        related_name="jbo_push_campaigns",
        blank=True,
    )
```

(`photo_scan` OneToOne nullable permanece para legado/histórico; fluxo novo deixa `null` e usa M2M.)

```bash
python manage.py makemigrations jbo_public --name encarte_push_debounce_per_store
```

- [ ] **Step 4: GREEN + commit**

```bash
pytest tests/jbo_public/test_encarte_push_debounce_models.py -q
git add apps/jbo_public/models.py apps/jbo_public/migrations/ \
  tests/jbo_public/test_encarte_push_debounce_models.py
git commit -m "$(cat <<'EOF'
feat: modelos de debounce de push de encartes por loja

EOF
)"
```

---

### Task 2: schedule + flush + campanha de lote

**Files:**
- Modify: `apps/jbo_public/services/encarte_push.py`
- Modify: `apps/jbo_public/services/push_campaigns.py`
- Modify: `tests/jbo_public/test_jbo_encarte_push.py`

**Interfaces:**
- Consumes: modelos Task 1
- Produces:
  - `ENCARTE_PUSH_DEBOUNCE = timedelta(minutes=15)`
  - `schedule_encarte_push(scan_id) -> None` (substitui efeito imediato de `maybe_dispatch_encarte_push`)
  - `flush_due_store_windows(*, now=None) -> int`  # nº de campanhas criadas
  - `create_store_encarte_campaign(*, establishment, scans) -> JboPushCampaign | None`

- [ ] **Step 1: Reescrever testes RED**

Substituir/adaptar `test_jbo_encarte_push.py`:

```python
from datetime import timedelta
from unittest.mock import patch
from django.utils import timezone

from apps.jbo_public.models import (
    JboEncartePushPending,
    JboPushCampaign,
    JboStoreEncartePushWindow,
)
from apps.jbo_public.services.encarte_push import (
    ENCARTE_PUSH_DEBOUNCE,
    flush_due_store_windows,
    maybe_dispatch_encarte_push,
)


def test_eligible_scan_schedules_pending_without_immediate_campaign(
    monkeypatch, jbo_user,
):
    est = _est()
    device = JboPushDevice.objects.create(
        endpoint="https://push.example/a", p256dh="x", auth="y",
    )
    JboStoreFollow.objects.create(device=device, establishment=est)
    scan = _scan(jbo_user, est)

    sent = []
    monkeypatch.setattr(
        "apps.notifications.push.sender.WebPushSender.send",
        lambda self, sub, payload: sent.append(payload) or (201, None),
    )

    maybe_dispatch_encarte_push(scan.id)

    assert JboEncartePushPending.objects.filter(
        photo_scan=scan, notified_at__isnull=True,
    ).exists()
    win = JboStoreEncartePushWindow.objects.get(establishment=est)
    assert win.quiet_until > timezone.now() + timedelta(minutes=14)
    assert not JboPushCampaign.objects.filter(kind="encarte").exists()
    assert sent == []


def test_second_scan_extends_quiet_until(jbo_user):
    est = _est()
    s1 = _scan(jbo_user, est)
    maybe_dispatch_encarte_push(s1.id)
    t1 = JboStoreEncartePushWindow.objects.get(pk=est.pk).quiet_until
    s2 = _scan(jbo_user, est)
    maybe_dispatch_encarte_push(s2.id)
    t2 = JboStoreEncartePushWindow.objects.get(pk=est.pk).quiet_until
    assert t2 > t1
    assert JboEncartePushPending.objects.filter(
        establishment=est, notified_at__isnull=True,
    ).count() == 2


def test_flush_sends_one_campaign_with_store_url(monkeypatch, jbo_user):
    est = _est(name="Mercado X")
    device = JboPushDevice.objects.create(
        endpoint="https://push.example/b", p256dh="x", auth="y",
    )
    JboStoreFollow.objects.create(device=device, establishment=est)
    s1 = _scan(jbo_user, est)
    s2 = _scan(jbo_user, est)
    maybe_dispatch_encarte_push(s1.id)
    maybe_dispatch_encarte_push(s2.id)

    sent = []
    monkeypatch.setattr(
        "apps.notifications.push.sender.WebPushSender.send",
        lambda self, sub, payload: sent.append(payload) or (201, None),
    )

    # força vencimento da janela
    JboStoreEncartePushWindow.objects.filter(pk=est.pk).update(
        quiet_until=timezone.now() - timedelta(seconds=1),
    )

    with patch(
        "apps.jbo_public.tasks.dispatch_jbo_push_campaign.delay",
        side_effect=lambda cid: __import__(
            "apps.jbo_public.tasks", fromlist=["dispatch_jbo_push_campaign"]
        ).dispatch_jbo_push_campaign(cid),
    ):
        n = flush_due_store_windows()

    assert n == 1
    assert len(sent) == 1
    assert sent[0]["title"] == "Mercado X"
    assert sent[0]["body"] == "Novas ofertas"
    assert sent[0]["url"] == f"/encartes?establishment_ids={est.id}"
    assert not sent[0]["url"].startswith("/encarte/")
    camp = JboPushCampaign.objects.get(kind="encarte")
    assert camp.photo_scan_id is None
    assert set(camp.photo_scans.values_list("id", flat=True)) == {s1.id, s2.id}
    assert JboEncartePushPending.objects.filter(
        establishment=est, notified_at__isnull=True,
    ).count() == 0


def test_flush_skips_when_window_not_due(jbo_user):
    est = _est()
    maybe_dispatch_encarte_push(_scan(jbo_user, est).id)
    assert flush_due_store_windows() == 0
    assert JboPushCampaign.objects.count() == 0


def test_independent_stores(jbo_user):
    a, b = _est(name="A"), _est(name="B")
    maybe_dispatch_encarte_push(_scan(jbo_user, a).id)
    maybe_dispatch_encarte_push(_scan(jbo_user, b).id)
    assert JboStoreEncartePushWindow.objects.count() == 2
```

Remover/atualizar o teste antigo `test_eligible_scan_notifies_followers_once` que esperava push imediato e URL `/encarte/`.

- [ ] **Step 2: RED**

```bash
pytest tests/jbo_public/test_jbo_encarte_push.py -q
```

- [ ] **Step 3: Implementar serviços**

`encarte_push.py`:

```python
ENCARTE_PUSH_DEBOUNCE = timedelta(minutes=15)

def maybe_dispatch_encarte_push(scan_id: UUID) -> None:
    scan = PhotoScan.objects.select_related("establishment").filter(pk=scan_id).first()
    if scan is None:
        return
    if not eligible_encartes_qs().filter(pk=scan_id).exists():
        return
    if timezone.now() - scan.created_at >= ENCARTE_PUSH_MAX_AGE:
        return
    if JboEncartePushPending.objects.filter(photo_scan=scan).exists():
        return  # já pendente ou notificado (OneToOne)

    quiet_until = timezone.now() + ENCARTE_PUSH_DEBOUNCE
    with transaction.atomic():
        JboEncartePushPending.objects.create(
            establishment=scan.establishment,
            photo_scan=scan,
        )
        JboStoreEncartePushWindow.objects.update_or_create(
            establishment=scan.establishment,
            defaults={"quiet_until": quiet_until},
        )


def flush_due_store_windows(*, now=None) -> int:
    now = now or timezone.now()
    created = 0
    due = list(
        JboStoreEncartePushWindow.objects.filter(quiet_until__lte=now)
        .select_related("establishment")
    )
    for win in due:
        from apps.jbo_public.services.push_campaigns import create_store_encarte_campaign
        from apps.jbo_public.tasks import dispatch_jbo_push_campaign

        pending_qs = JboEncartePushPending.objects.filter(
            establishment=win.establishment,
            notified_at__isnull=True,
            photo_scan_id__in=eligible_encartes_qs().values("id"),
        ).select_related("photo_scan")
        scans = [p.photo_scan for p in pending_qs]
        if not scans:
            # limpa pendentes inelegíveis e janela
            JboEncartePushPending.objects.filter(
                establishment=win.establishment, notified_at__isnull=True,
            ).delete()
            win.delete()
            continue

        camp = create_store_encarte_campaign(
            establishment=win.establishment, scans=scans,
        )
        if camp is None:
            continue
        JboEncartePushPending.objects.filter(
            photo_scan__in=scans, notified_at__isnull=True,
        ).update(notified_at=now)
        win.delete()
        created += 1
        cid = str(camp.id)
        transaction.on_commit(lambda c=cid: dispatch_jbo_push_campaign.delay(c))
    return created
```

Em `push_campaigns.py`, adicionar (manter `create_encarte_campaign` legado só se testes/admin ainda precisarem; preferir **não** usá-lo no signal):

```python
def create_store_encarte_campaign(*, establishment, scans: list[PhotoScan]):
    if not scans:
        return None
    with transaction.atomic():
        campaign = JboPushCampaign.objects.create(
            kind=JboPushCampaign.KIND_ENCARTE,
            title=establishment.name[:80],
            body="Novas ofertas",
            url=f"/encartes?establishment_ids={establishment.id}",
            status=JboPushCampaign.STATUS_SENDING,
            photo_scan=None,
        )
        campaign.establishments.add(establishment)
        campaign.photo_scans.set(scans)
        device_ids = resolve_device_ids([establishment.id])
        create_recipients(campaign, device_ids)
    return campaign
```

- [ ] **Step 4: GREEN**

```bash
pytest tests/jbo_public/test_jbo_encarte_push.py tests/jbo_public/test_encarte_push_debounce_models.py -q
```

- [ ] **Step 5: Commit**

```bash
git add apps/jbo_public/services/encarte_push.py \
  apps/jbo_public/services/push_campaigns.py \
  tests/jbo_public/test_jbo_encarte_push.py
git commit -m "$(cat <<'EOF'
feat: debounce de push de encartes por loja (15 min)

EOF
)"
```

---

### Task 3: Beat + task Celery

**Files:**
- Modify: `apps/jbo_public/tasks.py`
- Modify: `config/celery.py`
- Modify: `tests/jbo_public/test_jbo_encarte_push.py` (smoke da task) **ou** teste mínimo de schedule

**Interfaces:**
- Produces: `flush_jbo_store_encarte_push_windows` shared_task; beat `*/1`

- [ ] **Step 1: Teste RED**

```python
def test_celery_task_calls_flush(monkeypatch):
    called = []
    monkeypatch.setattr(
        "apps.jbo_public.services.encarte_push.flush_due_store_windows",
        lambda: called.append(1) or 0,
    )
    from apps.jbo_public.tasks import flush_jbo_store_encarte_push_windows
    flush_jbo_store_encarte_push_windows()
    assert called == [1]
```

E assert no `celery.py` (teste de string do módulo, como outros plans do repo):

```python
def test_beat_registers_store_encarte_flush():
    from pathlib import Path
    text = Path("config/celery.py").read_text()
    assert "flush_jbo_store_encarte_push_windows" in text
    assert 'minute="*/1"' in text or "minute='*/1'" in text
```

- [ ] **Step 2: Implementar**

```python
@shared_task
def flush_jbo_store_encarte_push_windows():
    from apps.jbo_public.services.encarte_push import flush_due_store_windows
    return flush_due_store_windows()
```

Em `config/celery.py`:

```python
    "jbo-store-encarte-push-flush": {
        "task": "apps.jbo_public.tasks.flush_jbo_store_encarte_push_windows",
        "schedule": crontab(minute="*/1"),
    },
```

- [ ] **Step 3: GREEN + commit**

```bash
pytest tests/jbo_public/test_jbo_encarte_push.py -q
git add apps/jbo_public/tasks.py config/celery.py tests/jbo_public/
git commit -m "$(cat <<'EOF'
feat: Beat 1 min faz flush das janelas de push por loja

EOF
)"
```

Reiniciar `beat` + `worker` após deploy loc.

---

## Self-review (plan vs spec)

| Spec | Task |
|------|------|
| Sem push imediato | Task 2 `maybe_dispatch` só agenda |
| 15 min + reinício | Task 2 `quiet_until` |
| URL establishment_ids | Task 2 `create_store_encarte_campaign` |
| title/body Novas ofertas | Task 2 |
| quiet_until + Beat | Tasks 2–3 |
| Campanha por lote, photo_scan null + M2M | Tasks 1–2 |
| Manual intacto | Sem mudança em `create_manual_campaign` |
| Sem prd | Constraints |
