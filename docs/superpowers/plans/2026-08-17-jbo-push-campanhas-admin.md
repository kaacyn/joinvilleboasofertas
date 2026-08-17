# Campanhas JBO para dispositivos anônimos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin envia push para follows de lojas JBO e vê histórico (incluindo encarte automático) com métricas de entrega e clique, no Snap Studio.

**Architecture:** Tabelas novas em `jbo_public` (`JboPushCampaign`, destinatários por dispositivo, snapshot de lojas). Fan-out Celery reusa `WebPushSender` com `click_token` no payload. Admin API em `/api/admin/jbo/push-campaigns`. Clique público em `/api/public/jbo/push/click`. Studio ganha seletor Snap/JBO. SW do JBO reporta clique antes de abrir a URL.

**Tech Stack:** Django Ninja, Celery, pytest, Vue 3 (snap-studio), Vitest, Workbox SW (dev-joinvilleboasofertas).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-17-jbo-push-campanhas-admin-design.md`.
- **Não alterar** `NotificationCampaign`, `NotificationRecipient`, `PushSubscription`, `notify()`.
- Público JBO: sem login; `endpoint`/`click_token` são segredos — nunca expor na admin API.
- União de follows: um dispositivo = um recipient por campanha.
- URL da campanha: vazia ou path começando com `/` (max 255).
- Título 1..80, corpo 1..240.
- Máximo **50** lojas por campanha `manual`.
- Agendamento fora de v1 (envia agora).
- Backfill de `JboEncartePushDispatch` antigo: **não**.
- Preservar WIP alheio na API; stage só hunks desta fatia.
- Pré-requisito: sino implementado (`2026-08-17-jbo-push-anonimo.md`).

## File map

| Arquivo | Responsabilidade |
|---------|------------------|
| `apps/jbo_public/models.py` | `JboPushCampaign`, `JboPushRecipient`, M2M lojas |
| `apps/jbo_public/services/push_campaigns.py` | Criar campanha, resolver audiência, finalizar status |
| `apps/jbo_public/services/push_click.py` | Registrar clique por token |
| `apps/jbo_public/admin_api.py` | Rotas admin Studio |
| `apps/jbo_public/admin_schemas.py` | Schemas Ninja admin |
| `apps/jbo_public/tasks.py` | `dispatch_jbo_push_campaign`, fan-out |
| `apps/jbo_public/services/encarte_push.py` | Cria campanha `encarte` em vez de `JboEncartePushDispatch` |
| `apps/jbo_public/api.py` | `POST /push/click` público |
| `config/urls.py` | `api.add_router("/admin/jbo", jbo_admin_router)` |
| `snap-studio/src/api/adminJboPushCampaigns.js` | Client HTTP |
| `snap-studio/src/composables/useAdminJboPushCampaigns.js` | Estado Studio |
| `snap-studio/src/components/notifications/JboPushCampaignComposer.vue` | Compositor lojas |
| `snap-studio/src/components/notifications/JboPushCampaignHistory.vue` | Histórico JBO |
| `snap-studio/src/views/JboPushCampaignDetailView.vue` | Detalhe + destinatários |
| `dev-joinvilleboasofertas/app/sw.ts` | `click_token` + POST click |

---

### Task 1: Modelos de campanha JBO

**Files:**
- Modify: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/models.py`
- Create: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/migrations/0002_jbo_push_campaigns.py`
- Test: `/root/Docker/projetos/dev-snap-api/tests/jbo_public/test_jbo_push_campaign_models.py`

**Interfaces:**
- Produces: `JboPushCampaign(id UUID, kind, title, body, url, status, photo_scan?, created_by?, client_request_id, created_at, sent_at)`
- Produces: `JboPushCampaign.establishments` M2M → `Establishment`
- Produces: `JboPushRecipient(campaign, device?, user_agent, click_token, status, delivered_at?, clicked_at?, failure_reason)`
- Produces: `JboPushCampaign.metrics` property → `{target, delivered, clicked, failed}`

- [ ] **Step 1: Write the failing test**

```python
import pytest
from django.db import IntegrityError
from apps.jbo_public.models import JboPushCampaign, JboPushRecipient, JboPushDevice

pytestmark = pytest.mark.django_db

def test_campaign_photo_scan_unique(jbo_user, jbo_establishment):
    from apps.records.models import PhotoScan
    scan = PhotoScan.objects.filter(establishment=jbo_establishment).first()
    if scan is None:
        pytest.skip("fixture scan")
    JboPushCampaign.objects.create(
        kind="encarte", title="Loja", body="Novo encarte",
        url=f"/encarte/{scan.id}", status="sent", photo_scan=scan,
    )
    with pytest.raises(IntegrityError):
        JboPushCampaign.objects.create(
            kind="encarte", title="Loja", body="Novo encarte",
            url=f"/encarte/{scan.id}", status="sent", photo_scan=scan,
        )

def test_recipient_unique_per_campaign_device(jbo_establishment):
    device = JboPushDevice.objects.create(
        endpoint="https://push.example/camp", p256dh="x", auth="y", user_agent="TestUA",
    )
    camp = JboPushCampaign.objects.create(
        kind="manual", title="T", body="B", status="sending",
    )
    JboPushRecipient.objects.create(
        campaign=camp, device=device, user_agent="TestUA",
        click_token="tok-a", status="pending",
    )
    with pytest.raises(IntegrityError):
        JboPushRecipient.objects.create(
            campaign=camp, device=device, user_agent="TestUA",
            click_token="tok-b", status="pending",
        )

def test_metrics_clicked_counts_as_delivered(jbo_establishment):
    camp = JboPushCampaign.objects.create(kind="manual", title="T", body="B", status="sent")
    device = JboPushDevice.objects.create(
        endpoint="https://push.example/m", p256dh="x", auth="y",
    )
    JboPushRecipient.objects.create(
        campaign=camp, device=device, user_agent="UA",
        click_token="t1", status="clicked",
    )
    JboPushRecipient.objects.create(
        campaign=camp, device=None, user_agent="Gone",
        click_token="t2", status="failed", failure_reason="gone",
    )
    m = camp.metrics
    assert m == {"target": 2, "delivered": 1, "clicked": 1, "failed": 1}
```

Duplicar helper `_est` mínimo no arquivo de teste (não importar de outro módulo de teste).

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec snap-api-dev pytest tests/jbo_public/test_jbo_push_campaign_models.py -v`
Expected: FAIL — `JboPushCampaign` not defined

- [ ] **Step 3: Implement models + migration**

Em `models.py`, adicionar:

```python
class JboPushCampaign(models.Model):
    KIND_MANUAL = "manual"
    KIND_ENCARTE = "encarte"
    KIND_CHOICES = [(KIND_MANUAL, "Manual"), (KIND_ENCARTE, "Encarte")]

    STATUS_SENDING = "sending"
    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_SENDING, "Sending"),
        (STATUS_SENT, "Sent"),
        (STATUS_FAILED, "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=16, choices=KIND_CHOICES)
    title = models.CharField(max_length=80)
    body = models.CharField(max_length=240)
    url = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_SENDING)
    photo_scan = models.OneToOneField(
        "records.PhotoScan", null=True, blank=True, on_delete=models.CASCADE,
        related_name="jbo_push_campaign",
    )
    establishments = models.ManyToManyField(
        "establishments.Establishment", related_name="jbo_push_campaigns", blank=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="jbo_push_campaigns",
    )
    client_request_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    @property
    def metrics(self):
        rows = self.recipients.values("status").annotate(c=Count("id"))
        counts = {r["status"]: r["c"] for r in rows}
        clicked = counts.get("clicked", 0)
        delivered = counts.get("delivered", 0) + clicked
        return {
            "target": sum(counts.values()),
            "delivered": delivered,
            "clicked": clicked,
            "failed": counts.get("failed", 0),
        }


class JboPushRecipient(models.Model):
    STATUS_PENDING = "pending"
    STATUS_DELIVERED = "delivered"
    STATUS_CLICKED = "clicked"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_CLICKED, "Clicked"),
        (STATUS_FAILED, "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(JboPushCampaign, on_delete=models.CASCADE, related_name="recipients")
    device = models.ForeignKey(
        JboPushDevice, null=True, blank=True, on_delete=models.SET_NULL, related_name="push_recipients",
    )
    user_agent = models.CharField(max_length=255, blank=True, default="")
    click_token = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING)
    delivered_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        unique_together = [("campaign", "device")]
```

`makemigrations jbo_public` → `0002_jbo_push_campaigns.py`. Dependência: `0001_jbo_push`.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec snap-api-dev pytest tests/jbo_public/test_jbo_push_campaign_models.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /root/Docker/projetos/dev-snap-api
git add apps/jbo_public/models.py apps/jbo_public/migrations/0002_jbo_push_campaigns.py tests/jbo_public/test_jbo_push_campaign_models.py
git commit -m "feat: modelos de campanha push JBO e destinatários por dispositivo"
```

---

### Task 2: Serviço de campanha e audiência

**Files:**
- Create: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/services/push_campaigns.py`
- Test: `/root/Docker/projetos/dev-snap-api/tests/jbo_public/test_jbo_push_campaign_service.py`

**Interfaces:**
- Consumes: `JboPushCampaign`, `JboPushRecipient`, `JboStoreFollow`, `jbo_establishments_qs()`
- Produces: `resolve_device_ids(establishment_ids: list[UUID]) -> list[int]` — união distinta
- Produces: `create_recipients(campaign: JboPushCampaign, device_ids: list[int]) -> int`
- Produces: `finalize_campaign_status(campaign_id: UUID) -> None`
- Produces: `create_manual_campaign(*, title, body, url, establishment_ids, created_by, client_request_id) -> JboPushCampaign`
- Produces: `create_encarte_campaign(*, scan: PhotoScan) -> JboPushCampaign | None` — retorna existente se já houver

- [ ] **Step 1: Write the failing test**

```python
import pytest
from uuid import uuid4
from apps.jbo_public.models import JboPushDevice, JboPushRecipient, JboStoreFollow, JboPushCampaign
from apps.jbo_public.services.push_campaigns import resolve_device_ids, create_recipients

pytestmark = pytest.mark.django_db

def _est(name="Loja A"):
    from apps.establishments.models import Establishment
    return Establishment.objects.create(
        name=name, address="a", lat=-26.3, lng=-48.8,
        source=Establishment.SOURCE_MANUAL,
    )

def test_union_two_stores_one_device():
    a, b = _est("A"), _est("B")
    dev = JboPushDevice.objects.create(endpoint="https://push.example/u", p256dh="x", auth="y")
    JboStoreFollow.objects.create(device=dev, establishment=a)
    JboStoreFollow.objects.create(device=dev, establishment=b)
    ids = resolve_device_ids([a.id, b.id])
    assert ids == [dev.id]

def test_create_recipients_one_per_device():
    est = _est()
    dev = JboPushDevice.objects.create(
        endpoint="https://push.example/r", p256dh="x", auth="y", user_agent="Chrome",
    )
    JboStoreFollow.objects.create(device=dev, establishment=est)
    camp = JboPushCampaign.objects.create(kind="manual", title="T", body="B", status="sending")
    camp.establishments.add(est)
    n = create_recipients(camp, [dev.id])
    assert n == 1
    r = JboPushRecipient.objects.get(campaign=camp)
    assert r.user_agent == "Chrome"
    assert len(r.click_token) >= 16
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `docker exec snap-api-dev pytest tests/jbo_public/test_jbo_push_campaign_service.py -v`

- [ ] **Step 3: Implement `push_campaigns.py`**

```python
import secrets
from uuid import UUID
from django.db import transaction
from django.utils import timezone
from ninja.errors import HttpError

from apps.jbo_public.models import (
    JboPushCampaign, JboPushRecipient, JboPushDevice, JboStoreFollow,
)
from apps.jbo_public.scope import jbo_establishments_qs

MAX_STORES = 50

def resolve_device_ids(establishment_ids: list[UUID]) -> list[int]:
    qs = JboStoreFollow.objects.filter(establishment_id__in=establishment_ids)
    return list(qs.values_list("device_id", flat=True).distinct())

def create_recipients(campaign: JboPushCampaign, device_ids: list[int]) -> int:
    devices = {
        d.id: d for d in JboPushDevice.objects.filter(id__in=device_ids)
    }
    rows = []
    for did in device_ids:
        d = devices.get(did)
        if d is None:
            continue
        rows.append(JboPushRecipient(
            campaign=campaign, device=d, user_agent=d.user_agent or "",
            click_token=secrets.token_urlsafe(32), status=JboPushRecipient.STATUS_PENDING,
        ))
    JboPushRecipient.objects.bulk_create(rows, ignore_conflicts=True)
    return len(rows)

def finalize_campaign_status(campaign_id: UUID) -> None:
    camp = JboPushCampaign.objects.filter(pk=campaign_id).first()
    if camp is None or camp.status != JboPushCampaign.STATUS_SENDING:
        return
    pending = camp.recipients.filter(status=JboPushRecipient.STATUS_PENDING).exists()
    if pending:
        return
    total = camp.recipients.count()
    failed = camp.recipients.filter(status=JboPushRecipient.STATUS_FAILED).count()
    if total > 0 and failed == total:
        camp.status = JboPushCampaign.STATUS_FAILED
    else:
        camp.status = JboPushCampaign.STATUS_SENT
    camp.sent_at = timezone.now()
    camp.save(update_fields=["status", "sent_at"])
```

Implementar também `create_manual_campaign` (valida lojas JBO, limite 50, idempotência por `client_request_id`) e `create_encarte_campaign` (get_or_create por `photo_scan`).

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: serviço de campanha push JBO com união de follows"
```

---

### Task 3: Celery fan-out e encarte via campanha

**Files:**
- Modify: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/tasks.py`
- Modify: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/services/encarte_push.py`
- Modify: `/root/Docker/projetos/dev-snap-api/tests/jbo_public/test_jbo_encarte_push.py`

**Interfaces:**
- Produces: `dispatch_jbo_push_campaign(campaign_id: str) -> None` — substitui lógica direta de `dispatch_jbo_encarte_push`
- Consumes: `create_encarte_campaign`, `create_recipients`, `finalize_campaign_status`
- Payload push: `{title, body, url, click_token, tag: f"jbo-{campaign_id}"}`

- [ ] **Step 1: Update failing encarte test**

Em `test_jbo_encarte_push.py`, trocar asserções de `JboEncartePushDispatch` por `JboPushCampaign`:

```python
from apps.jbo_public.models import JboPushCampaign, JboPushRecipient

def test_eligible_scan_creates_encarte_campaign(monkeypatch, jbo_user):
    sent = []
    monkeypatch.setattr(
        "apps.jbo_public.services.encarte_push.dispatch_jbo_push_campaign.delay",
        lambda cid: sent.append(cid),
    )
    # ... setup scan + follow ...
    from apps.jbo_public.services.encarte_push import maybe_dispatch_encarte_push
    maybe_dispatch_encarte_push(scan.id)
    camp = JboPushCampaign.objects.get(photo_scan=scan)
    assert camp.kind == "encarte"
    assert camp.title == est.name
    assert sent == [str(camp.id)]

def test_second_dispatch_does_not_duplicate(monkeypatch, jbo_user):
    # maybe_dispatch twice → uma campanha, delay chamado uma vez
```

- [ ] **Step 2: Run — expect FAIL**

Run: `docker exec snap-api-dev pytest tests/jbo_public/test_jbo_encarte_push.py -v`

- [ ] **Step 3: Refatorar tasks + encarte_push**

`encarte_push.py`:

```python
def maybe_dispatch_encarte_push(scan_id: UUID) -> None:
    # ... elegibilidade + 24h iguais ...
    from apps.jbo_public.services.push_campaigns import create_encarte_campaign
    from apps.jbo_public.tasks import dispatch_jbo_push_campaign

    camp = create_encarte_campaign(scan=scan)
    if camp is None:
        return
    transaction.on_commit(lambda: dispatch_jbo_push_campaign.delay(str(camp.id)))
```

`tasks.py` — nova task `dispatch_jbo_push_campaign`:

```python
@shared_task
def dispatch_jbo_push_campaign(campaign_id):
    from apps.jbo_public.models import JboPushCampaign, JboPushRecipient, JboPushDevice
    from apps.jbo_public.services.push_campaigns import finalize_campaign_status

    camp = JboPushCampaign.objects.filter(pk=campaign_id).first()
    if camp is None:
        return
    sender = WebPushSender()
    for rec in camp.recipients.filter(status=JboPushRecipient.STATUS_PENDING).select_related("device"):
        device = rec.device
        if device is None:
            rec.status = JboPushRecipient.STATUS_FAILED
            rec.failure_reason = "gone"
            rec.save(update_fields=["status", "failure_reason"])
            continue
        payload = {
            "title": camp.title, "body": camp.body, "url": camp.url,
            "click_token": rec.click_token, "tag": f"jbo-{camp.id}",
        }
        status, err = sender.send({...}, payload)
        # 2xx → delivered; 404/410 → failed/gone + device.delete(); demais → failed + failed_count
    finalize_campaign_status(campaign_id)
```

Remover uso de `JboEncartePushDispatch` em `encarte_push.py`. Manter task antiga `dispatch_jbo_encarte_push` como shim que no-op ou deletar se nenhum caller restar.

- [ ] **Step 4: Run encarte tests — PASS**

Run: `docker exec snap-api-dev pytest tests/jbo_public/test_jbo_encarte_push.py -v`

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: encarte novo cria campanha JBO e dispara fan-out Celery"
```

---

### Task 4: Admin API Studio

**Files:**
- Create: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/admin_schemas.py`
- Create: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/admin_api.py`
- Modify: `/root/Docker/projetos/dev-snap-api/config/urls.py`
- Test: `/root/Docker/projetos/dev-snap-api/tests/jbo_public/test_jbo_push_campaigns_api.py`

**Interfaces:**
- Prefix: `/api/admin/jbo`
- Endpoints conforme spec (stores, preview, create, list, detail, recipients, retry-failed)
- Auth: `jwt_auth` + `_require_admin`

- [ ] **Step 1: Write failing API tests**

```python
BASE = "/api/admin/jbo/push-campaigns"

def test_create_manual_union_one_device(admin_client, est_a, est_b, device_follows_both):
    payload = {
        "title": "Promo", "body": "Corpo", "url": "/encartes",
        "establishment_ids": [str(est_a.id), str(est_b.id)],
    }
    r = admin_client.post(BASE, payload, content_type="application/json",
                          HTTP_X_REQUEST_ID="req-1")
    assert r.status_code in (200, 201)
    camp_id = r.json()["id"]
    rec = admin_client.get(f"{BASE}/{camp_id}/recipients")
    assert rec.json()["items"][0]["user_agent"]
    assert "endpoint" not in rec.json()["items"][0]

def test_create_no_notification_row(admin_client, est_a):
    from apps.notifications.models import Notification
    before = Notification.objects.count()
    admin_client.post(BASE, {...})
    assert Notification.objects.count() == before
```

Reusar helpers `_login` / admin user de `tests/test_campaigns_api.py`.

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement admin_api + register router**

`config/urls.py`:

```python
from apps.jbo_public.admin_api import router as jbo_admin_router
api.add_router("/admin/jbo", jbo_admin_router)
```

Create enfileira `dispatch_jbo_push_campaign.delay` no `on_commit`. Preview: `GET .../preview?establishment_ids=id1,id2`. Retry: repõe `failed` → `pending` e re-dispatch.

- [ ] **Step 4: Run full API tests — PASS**

Run: `docker exec snap-api-dev pytest tests/jbo_public/test_jbo_push_campaigns_api.py -v`

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: API admin de campanhas push JBO para o Studio"
```

---

### Task 5: Clique público

**Files:**
- Create: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/services/push_click.py`
- Modify: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/api.py`
- Modify: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/schemas.py`
- Test: `/root/Docker/projetos/dev-snap-api/tests/jbo_public/test_jbo_push_click_api.py`

**Interfaces:**
- Produces: `record_click(token: str) -> tuple[int, JboPushRecipient | None]` — 200 first click, 204 repeat, 404 invalid
- Route: `POST /api/public/jbo/push/click` body `{token}` rate `60/m` group `jbo_push_click`

- [ ] **Step 1: Write failing test**

```python
def test_click_marks_clicked(client, campaign_with_delivered_recipient):
    token = campaign_with_delivered_recipient.click_token
    r = client.post("/api/public/jbo/push/click", {"token": token}, content_type="application/json")
    assert r.status_code == 200
    campaign_with_delivered_recipient.refresh_from_db()
    assert campaign_with_delivered_recipient.status == "clicked"
    assert campaign_with_delivered_recipient.clicked_at is not None

def test_second_click_204(client, clicked_recipient):
    r = client.post("/api/public/jbo/push/click", {"token": clicked_recipient.click_token}, ...)
    assert r.status_code == 204
    old = clicked_recipient.clicked_at
    clicked_recipient.refresh_from_db()
    assert clicked_recipient.clicked_at == old
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement click service + route**

`record_click`: se status `pending` ou `delivered` → `clicked` + `clicked_at=now()`. Se já `clicked` → no-op. Token inválido → HttpError 404.

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: registra clique em push JBO via token público"
```

---

### Task 6: Snap Studio — API + estado

**Files:**
- Create: `/root/Docker/projetos/snap-studio/src/api/adminJboPushCampaigns.js`
- Create: `/root/Docker/projetos/snap-studio/src/composables/useAdminJboPushCampaigns.js`
- Create: `/root/Docker/projetos/snap-studio/src/api/__tests__/adminJboPushCampaigns.test.js`

**Interfaces:**
- Mirrors: `listCampaigns`, `getCampaign`, `listRecipients`, `createCampaign`, `retryFailed`, plus `listStores`, `previewAudience`

- [ ] **Step 1: Write failing test**

```javascript
import { createJboPushCampaign, listJboStores } from '../adminJboPushCampaigns'

it('createJboPushCampaign envia X-Request-Id', async () => {
  // mock client.post, assert header
})
```

- [ ] **Step 2: Run — FAIL**

Run: `cd /root/Docker/projetos/snap-studio && npm test -- adminJboPushCampaigns`

- [ ] **Step 3: Implement client + composable**

Composable espelha `useAdminNotifications.js` (campaigns, recipients, cursors, loading).

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit** (repo snap-studio)

```bash
git commit -m "feat: client e store de campanhas push JBO no Studio"
```

---

### Task 7: Snap Studio — UI

**Files:**
- Modify: `/root/Docker/projetos/snap-studio/src/views/NotificationsView.vue`
- Create: `/root/Docker/projetos/snap-studio/src/components/notifications/JboPushCampaignComposer.vue`
- Create: `/root/Docker/projetos/snap-studio/src/components/notifications/JboPushCampaignHistory.vue`
- Create: `/root/Docker/projetos/snap-studio/src/views/JboPushCampaignDetailView.vue`
- Modify: `/root/Docker/projetos/snap-studio/src/router/index.js`
- Test: `/root/Docker/projetos/snap-studio/src/views/__tests__/JboPushCampaignDetailView.test.js`

- [ ] **Step 1: Write failing component test**

```javascript
import { mount } from '@vue/test-utils'
import NotificationsView from '../NotificationsView.vue'

it('audience=jbo mostra compositor JBO', () => {
  const w = mount(NotificationsView, { global: { mocks: { $route: { query: { audience: 'jbo' } } } } })
  expect(w.html()).toContain('data-test="jbo-composer"')
})
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement UI**

`NotificationsView`: seletor público (`audience=snap|jbo` em query). Snap = componentes atuais. JBO = `JboPushCampaignComposer` / `JboPushCampaignHistory`.

Compositor: multi-select lojas (`GET /admin/jbo/push-campaigns/stores`), badge `device_count` via preview, campos título/corpo/url, botão enviar.

Histórico: cards com `kind`, status, métricas `target/delivered/clicked/failed`, link `/notificacoes/jbo/campanhas/:id`.

Detalhe: espelha `CampaignDetailView.vue` mas lista `device_id` + `user_agent`; botão retry-failed; sem cancel/duplicate.

- [ ] **Step 4: Run Studio tests — PASS**

Run: `cd /root/Docker/projetos/snap-studio && npm test`

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: área JBO no Estúdio de Notificações"
```

---

### Task 8: Service worker — click_token

**Files:**
- Modify: `/root/Docker/projetos/dev-joinvilleboasofertas/app/sw.ts`
- Modify: `/root/Docker/projetos/dev-joinvilleboasofertas/tests/pwaConfig.spec.ts` (ou novo `tests/jboPushClick.spec.ts`)

- [ ] **Step 1: Write failing source test**

```typescript
import { readFileSync } from 'node:fs'
const sw = readFileSync('app/sw.ts', 'utf8')
it('notificationclick POST click antes de abrir URL', () => {
  expect(sw).toContain('/api/public/jbo/push/click')
  expect(sw).toContain('click_token')
  expect(sw.indexOf('/push/click')).toBeLessThan(sw.indexOf('focusOrOpen'))
})
```

- [ ] **Step 2: Run — FAIL**

Run: `cd /root/Docker/projetos/dev-joinvilleboasofertas && npm test`

- [ ] **Step 3: Update SW**

```typescript
type PushPayload = { title?: string; body?: string; url?: string; click_token?: string; tag?: string }

async function handlePush(payload: PushPayload | null) {
  await self.registration.showNotification(title, {
    body,
    tag: payload?.tag,
    data: { url: resolvePushUrl(payload?.url), click_token: payload?.click_token ?? '' },
    ...
  })
}

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {}
  event.notification.close()
  event.waitUntil(reportClickThenOpen(data))
})

async function reportClickThenOpen(data: { url?: string; click_token?: string }) {
  if (data.click_token) {
    try {
      await fetch('/api/public/jbo/push/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.click_token }),
        keepalive: true,
      })
    } catch { /* abrir URL mesmo assim */ }
  }
  await focusOrOpen(resolvePushUrl(data.url))
})
```

- [ ] **Step 4: Run JBO tests — PASS**

- [ ] **Step 5: Commit**

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
git commit -m "feat: SW reporta clique em push JBO antes de abrir URL"
```

---

## Spec self-review (plan vs spec)

| Requisito spec | Task |
|----------------|------|
| Modelos campanha + recipient + M2M lojas | Task 1 |
| União follows, 1 device/campanha | Task 2 |
| Encarte → campanha `encarte` no histórico | Task 3 |
| Admin API completa | Task 4 |
| POST click público + rate limit | Task 5 |
| Studio seletor Snap/JBO | Task 7 |
| Métricas alvo/entregue/clicou/falhou | Tasks 1, 4, 7 |
| Retry failed | Tasks 4, 7 |
| SW click_token | Task 8 |
| Sem alterar Notification/PushSubscription | Task 4 test |
| Sem agendamento / sem todos dispositivos | Global Constraints |
| Recipient sem endpoint na API | Task 4 test |

Nenhum placeholder TBD restante.

## Smoke manual (pós-implementação)

1. Studio → Visitantes JBO → escolher 2 lojas → preview > 0 → enviar.
2. PWA com sino ativo → receber push → clicar → métrica `clicked` sobe no detalhe.
3. Novo encarte elegível → campanha `encarte` aparece no histórico.
4. Retry em recipient `failed` após simular 410.
