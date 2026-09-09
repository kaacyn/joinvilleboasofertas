# Sino público (Web Push anônimo por loja) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visitante sem conta segue uma loja no sino e recebe Web Push quando um encarte **novo** dessa loja se torna elegível.

**Architecture:** Tabelas JBO (`JboPushDevice`, `JboStoreFollow`, `JboEncartePushDispatch`) separadas de `PushSubscription`. Rotas públicas `/api/public/jbo/push/…`. Fan-out Celery reusa `WebPushSender`. SW do JBO trata `push` / `notificationclick`. UI do sino no card e em `/encarte/{id}`.

**Tech Stack:** Django, Celery, pywebpush, pytest, Nuxt, PushManager, Vitest.

## Global Constraints

- Sem login, sem inbox, sem alterar `PushSubscription` nem `/api/notifications/push/*`.
- Sino segue **loja** (`establishment_id`), não o papel.
- Um disparo por `photo_scan_id`; quem seguir depois não recebe o papel antigo.
- VAPID: só a chave **pública** na API; privada permanece em settings.
- Rate limit: 30 PUTs/IP/min em devices+follows.
- `POST /follows/query` leva `endpoint` no body, não na querystring.
- iOS: sino explica install se não estiver `standalone`.
- Preservar WIP alheio na API; stage só hunks desta fatia.
- Pré-requisito: PWA (SW) do plano `2026-08-17-jbo-pwa.md`.
- Spec: `docs/superpowers/specs/2026-08-17-jbo-pwa-push-share-design.md`.

---

### Task 1: Modelos

**Files:**
- Create: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/models.py`
- Modify: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/apps.py` se `default_auto_field` já existir
- Create: migration `apps/jbo_public/migrations/0001_jbo_push.py`
- Test: `/root/Docker/projetos/dev-snap-api/tests/jbo_public/test_jbo_push_models.py`

**Interfaces:**
- Produces: `JboPushDevice(endpoint unique, p256dh, auth, user_agent, failed_count, last_sent_at)`
- Produces: `JboStoreFollow(device, establishment)` unique_together
- Produces: `JboEncartePushDispatch(photo_scan unique)`

- [ ] **Step 1: Teste**

```python
import pytest
from django.db import IntegrityError
from apps.jbo_public.models import JboPushDevice, JboStoreFollow, JboEncartePushDispatch

pytestmark = pytest.mark.django_db

def test_device_endpoint_unique():
    JboPushDevice.objects.create(endpoint="https://push.example/a", p256dh="x", auth="y")
    with pytest.raises(IntegrityError):
        JboPushDevice.objects.create(endpoint="https://push.example/a", p256dh="x", auth="y")

def test_follow_unique_per_device_store(db):
    from tests.jbo_public.test_encartes_api import _est
    est = _est()
    device = JboPushDevice.objects.create(endpoint="https://push.example/b", p256dh="x", auth="y")
    JboStoreFollow.objects.create(device=device, establishment=est)
    with pytest.raises(IntegrityError):
        JboStoreFollow.objects.create(device=device, establishment=est)
```

Não importar `_est` de teste de outro módulo se isso acoplar — duplicar o helper mínimo no arquivo novo.

- [ ] **Step 2: RED → models + `makemigrations jbo_public` → migrate no container de teste → GREEN → commit**

```bash
git commit -m "feat: modelos de push anônimo e follow de loja no JBO"
```

---

### Task 2: Rotas públicas de push

**Files:**
- Create: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/services/push.py`
- Modify: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/api.py`
- Modify: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/schemas.py`
- Test: `/root/Docker/projetos/dev-snap-api/tests/jbo_public/test_jbo_push_api.py`

**Interfaces:**
- `GET /api/public/jbo/push/vapid-public-key` → `{public_key}`
- `PUT /api/public/jbo/push/devices` → upsert
- `POST /api/public/jbo/push/follows/query` → `{establishment_ids}`
- `PUT /api/public/jbo/push/follows` → `{endpoint, establishment_id, following}`

- [ ] **Step 1: Testes** (override VAPID, allowlist da loja)

```python
def test_vapid_public_key_omits_private(client, settings):
    settings.VAPID_PUBLIC_KEY = "public-test"
    settings.VAPID_PRIVATE_KEY = "secret-test"
    response = client.get("/api/public/jbo/push/vapid-public-key")
    assert response.status_code == 200
    assert response.json() == {"public_key": "public-test"}
    assert "secret-test" not in response.content.decode()

def test_follow_toggle_and_query(client, jbo_user):
    est = _est()
    body = {
        "endpoint": "https://push.example/c",
        "p256dh": "p",
        "auth": "a",
        "user_agent": "test",
    }
    with override_settings(JBO_ESTABLISHMENT_IDS=[str(est.id)], JBO_BBOX=None):
        assert client.put("/api/public/jbo/push/devices", data=body, content_type="application/json").status_code in (200, 201)
        on = client.put("/api/public/jbo/push/follows", data={
            "endpoint": body["endpoint"],
            "establishment_id": str(est.id),
            "following": True,
        }, content_type="application/json")
        assert on.status_code == 200
        listed = client.post("/api/public/jbo/push/follows/query", data={"endpoint": body["endpoint"]}, content_type="application/json")
        assert listed.json()["establishment_ids"] == [str(est.id)]

def test_follow_unknown_store_404(client):
    with override_settings(JBO_ESTABLISHMENT_IDS=[], JBO_BBOX=None):
        client.put("/api/public/jbo/push/devices", data={"endpoint": "https://e", "p256dh": "p", "auth": "a"}, content_type="application/json")
        response = client.put("/api/public/jbo/push/follows", data={
            "endpoint": "https://e",
            "establishment_id": str(uuid4()),
            "following": True,
        }, content_type="application/json")
    assert response.status_code == 404
```

Decorator: `@ratelimit(key="ip", rate="30/m", block=True)` nos PUTs.

- [ ] **Step 2: RED → implementação mínima → GREEN → commit**

```bash
git commit -m "feat: API pública de dispositivo e follow de loja JBO"
```

`jboPost`/`jboPut` no frontend só na task de UI.

---

### Task 3: Gatilho de encarte novo

**Files:**
- Create: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/services/encarte_push.py`
- Create: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/tasks.py`
- Create: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/signals.py`
- Modify: `apps/jbo_public/apps.py` — `ready()` importa signals
- Test: `/root/Docker/projetos/dev-snap-api/tests/jbo_public/test_jbo_encarte_push.py`

**Interfaces:**
- `maybe_dispatch_encarte_push(scan_id: UUID) -> None` — no-op se já existe `JboEncartePushDispatch` ou scan não elegível
- Task Celery `dispatch_jbo_encarte_push(scan_id)` chama `WebPushSender.send` por device follower
- Signal `post_save` PhotoScan → `transaction.on_commit(lambda: maybe_dispatch…)`

Payload push:

```python
{
    "title": scan.establishment.name,
    "body": "Novo encarte",
    "url": f"/encarte/{scan.id}",
}
```

Não criar `Notification` de inbox. Não usar `notify()`.

410/404: apagar `JboPushDevice` (copiar critério de `send_push_to_subscription`). Reusar `WebPushSender`; **não** passar `subscription_id` da tabela autenticada.

- [ ] **Step 1: Teste**

```python
@pytest.mark.django_db
def test_eligible_scan_notifies_followers_once(monkeypatch, jbo_user):
    sent = []
    monkeypatch.setattr(
        "apps.jbo_public.tasks.WebPushSender.send",
        lambda self, sub, payload: sent.append(payload) or (201, None),
    )
    est = _est()
    device = JboPushDevice.objects.create(endpoint="https://push.example/z", p256dh="p", auth="a")
    JboStoreFollow.objects.create(device=device, establishment=est)
    with override_settings(JBO_ESTABLISHMENT_IDS=[str(est.id)], JBO_BBOX=None):
        scan = _scan(jbo_user, est, ends_in=3)
        maybe_dispatch_encarte_push(scan.id)
        maybe_dispatch_encarte_push(scan.id)
    assert len(sent) == 1
    assert sent[0]["url"] == f"/encarte/{scan.id}"
```

O `_scan` já cria elegível: o signal pode disparar no create. O teste deve aceitar signal **ou** chamada explícita, mas a segunda chamada não duplica. Se o signal + teste explícito somarem 2, só exercitar o signal **ou** desconectar no teste e chamar `maybe_dispatch` duas vezes.

- [ ] **Step 2: RED → GREEN → commit**

```bash
git commit -m "feat: dispara Web Push no encarte JBO recém-elegível"
```

Não backfill: scans já existentes na data do deploy não ganham `JboEncartePushDispatch` até uma **nova** transição — na prática o `get_or_create` no dispatch no `post_save` de edits antigos pode notificar no primeiro save após o deploy. Mitigação: só disparar se `scan.created_at >= feature_flag` **ou** se o save mudou campos que tornam elegível e `created_at` é recente (< 1 hora). Spec: “só transição nova após o código entrar”. Implementar:

```python
# Só notifica se o scan foi criado nos últimos 15 minutos
# ou se promo_ends_on/dataset_status/image acabaram de ficar elegíveis
# e ainda não há dispatch.
```

Regra concreta: `JboEncartePushDispatch.get_or_create(photo_scan=scan)` + elegível **e** `timezone.now() - scan.created_at < timedelta(hours=24)` para não varrer o acervo no primeiro `save` em massa. Documentar no commit.

---

### Task 4: SW push + client + sino

**Files:**
- Modify: `app/sw.ts` (handlers `push` / `notificationclick`; **sem** badge de inbox)
- Modify: `app/utils/jboApi.ts` — `jboPut` / `jboPost`
- Create: `app/composables/useJboStoreFollow.ts`
- Modify: `EncarteCard.vue` e `app/pages/encarte/[id].vue` — botão sino irmão
- Test: `tests/encartesPage.spec.ts`, `tests/jboStoreFollow.spec.ts`

**Interfaces:**
- `useJboStoreFollow()`:
  - `isFollowing(establishmentId: string): boolean`
  - `toggle(establishmentId: string): Promise<void>`
  - carrega VAPID + `follows/query` no client

- [ ] **Step 1: Testes de source**

```ts
it('tem sino no card como irmão, não filho do botão de abrir', () => {
  const card = source('app/components/encartes/EncarteCard.vue')
  expect(card).toContain('aria-label="Receber avisos desta loja"')
  expect(card).toContain('useJboStoreFollow')
  expect(card).toMatch(/<article[\s\S]*class="card"/)
})

it('SW trata push e notificationclick', () => {
  const sw = source('app/sw.ts') // ou public/sw.js
  expect(sw).toContain("addEventListener('push'")
  expect(sw).toContain("addEventListener('notificationclick'")
  expect(sw).toContain('showNotification')
})
```

- [ ] **Step 2: Client HTTP**

```ts
export async function jboSend<T>(
  method: 'POST' | 'PUT',
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  return $fetch<T>(`${apiOrigin()}/api/public/jbo${path}`, { method, body })
}
```

Fluxo `toggle`:
1. Se `Notification.permission !== 'granted'`, `requestPermission`.
2. Se iOS && !standalone, não subscribe; mostrar recado.
3. `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`.
4. `PUT /push/devices`.
5. `PUT /push/follows` com `following: !current`.
6. Atualizar lista local; se PUT falhar, reverter UI.

Sino preenchido vs contorno via `aria-pressed`.

- [ ] **Step 3: GREEN + commit**

```bash
git commit -m "feat: sino anônimo segue loja e recebe Web Push de encarte"
```

---

## Verificação da fatia

1. Loc: instalar PWA (iOS) ou Chrome; tocar sino; permitir notificação.
2. `POST /follows/query` devolve a loja.
3. Criar/tornar elegível um PhotoScan novo daquela loja no admin/API → push chega → clique abre `/encarte/{id}`.
4. Segundo save do mesmo scan não reenvia.
5. `pytest tests/jbo_public/test_jbo_push_api.py tests/jbo_public/test_jbo_encarte_push.py tests/jbo_public/test_jbo_push_models.py` e `npm test` no JBO.

Inbox do Snap e `GET /api/notifications/` permanecem iguais.
